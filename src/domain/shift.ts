import { layoutDay, nextFreeStart, occupiedIntervals, type Interval } from "./schedule";
import {
  addDays,
  ceilToStep,
  formatClock,
  minuteOfDayFromEpoch,
  parseClock,
  todayISO,
} from "./time";
import { SCHEMA_VERSION } from "./types";
import type {
  BlockInstance,
  Settings,
  ShiftEvent,
  ShiftMove,
  ShiftStrategy,
} from "./types";

export interface ShiftWarning {
  key: string;
  params?: Record<string, string | number>;
}

export interface ShiftPlanInput {
  strategy: ShiftStrategy;
  date: string;
  instances: BlockInstance[];
  settings: Pick<Settings, "dayStart" | "dayEnd">;
  now: number;
  blockIds?: string[];
  targetDate?: string;
  swapWithId?: string;
  reason?: string | null;
  /** How many days ahead the engine may look for room. Defaults to 14. */
  horizonDays?: number;
}

export interface ShiftPlan {
  strategy: ShiftStrategy;
  date: string;
  reason: string | null;
  moves: ShiftMove[];
  warnings: ShiftWarning[];
  movedMinutes: number;
  skippedMinutes: number;
}

interface ResolvedBounds {
  dayStartMinute: number;
  dayEndMinute: number;
}

function resolveBounds(settings: Pick<Settings, "dayStart" | "dayEnd">): ResolvedBounds {
  const dayStartMinute = parseClock(settings.dayStart);
  const rawEnd = parseClock(settings.dayEnd);
  const dayEndMinute = rawEnd > dayStartMinute ? rawEnd : dayStartMinute + 12 * 60;
  return { dayStartMinute, dayEndMinute };
}

function instancesOn(instances: BlockInstance[], date: string): BlockInstance[] {
  return instances.filter((instance) => instance.date === date);
}

function durationSum(instances: BlockInstance[]): number {
  return instances.reduce((sum, instance) => sum + Math.max(1, instance.durationMin), 0);
}

/**
 * Blocks a reschedule is allowed to touch.
 *
 * Only `planned` blocks move. A running block is already happening, and
 * skipping it would silently throw away measured time.
 */
function movableBlocks(
  instances: BlockInstance[],
  date: string,
  bounds: ResolvedBounds,
  blockIds?: string[],
): BlockInstance[] {
  const filter = blockIds && blockIds.length > 0 ? new Set(blockIds) : null;
  return layoutDay(instancesOn(instances, date), { dayStartMinute: bounds.dayStartMinute })
    .filter((block) => block.instance.status === "planned")
    .filter((block) => (filter ? filter.has(block.instance.id) : true))
    .map((block) => block.instance);
}

function hasRunningBlock(instances: BlockInstance[], date: string): boolean {
  return instancesOn(instances, date).some((instance) => instance.status === "running");
}

function planSkipRest(
  input: ShiftPlanInput,
  bounds: ResolvedBounds,
): ShiftPlan {
  const targets = movableBlocks(input.instances, input.date, bounds, input.blockIds);
  const warnings: ShiftWarning[] = [];

  if (targets.length === 0) {
    warnings.push({ key: "shift.warning.nothingToMove" });
  }
  if (hasRunningBlock(input.instances, input.date)) {
    warnings.push({ key: "shift.warning.runningKept" });
  }

  const moves: ShiftMove[] = targets.map((instance) => ({
    instanceId: instance.id,
    title: instance.title,
    action: "skipped",
    fromDate: instance.date,
    toDate: instance.date,
    fromStart: instance.plannedStart,
    toStart: null,
  }));

  return {
    strategy: "skip_rest",
    date: input.date,
    reason: input.reason ?? null,
    moves,
    warnings,
    movedMinutes: 0,
    skippedMinutes: durationSum(targets),
  };
}

export function planShift(input: ShiftPlanInput): ShiftPlan {
  const bounds = resolveBounds(input.settings);

  if (input.strategy === "skip_rest") {
    return planSkipRest(input, bounds);
  }

  if (input.strategy === "swap") {
    return planSwap(input);
  }

  return planMoveOpen(input, bounds);
}

/** A swap only exchanges positions, so it needs no day bounds. */
function planSwap(input: ShiftPlanInput): ShiftPlan {
  const warnings: ShiftWarning[] = [];
  const [firstId] = input.blockIds ?? [];

  const first = input.instances.find((instance) => instance.id === firstId);
  const second = input.instances.find((instance) => instance.id === input.swapWithId);

  if (!first || !second) {
    return {
      strategy: "swap",
      date: input.date,
      reason: input.reason ?? null,
      moves: [],
      warnings: [{ key: "shift.warning.pickTwo" }],
      movedMinutes: 0,
      skippedMinutes: 0,
    };
  }

  if (first.date !== second.date || first.date !== input.date) {
    return {
      strategy: "swap",
      date: input.date,
      reason: input.reason ?? null,
      moves: [],
      warnings: [{ key: "shift.warning.swapSameDayOnly" }],
      movedMinutes: 0,
      skippedMinutes: 0,
    };
  }

  if (first.plannedStart === second.plannedStart && first.order === second.order) {
    warnings.push({ key: "shift.warning.swapNoEffect" });
  }

  const moves: ShiftMove[] = [
    {
      instanceId: first.id,
      title: first.title,
      action: "moved",
      fromDate: first.date,
      toDate: first.date,
      fromStart: first.plannedStart,
      toStart: second.plannedStart,
    },
    {
      instanceId: second.id,
      title: second.title,
      action: "moved",
      fromDate: second.date,
      toDate: second.date,
      fromStart: second.plannedStart,
      toStart: first.plannedStart,
    },
  ];

  return {
    strategy: "swap",
    date: input.date,
    reason: input.reason ?? null,
    moves,
    warnings,
    movedMinutes: 0,
    skippedMinutes: 0,
  };
}

function planMoveOpen(input: ShiftPlanInput, bounds: ResolvedBounds): ShiftPlan {
  const horizon = Math.max(1, input.horizonDays ?? 14);
  const warnings: ShiftWarning[] = [];
  const moving = movableBlocks(input.instances, input.date, bounds, input.blockIds);

  if (moving.length === 0) {
    return {
      strategy: input.strategy,
      date: input.date,
      reason: input.reason ?? null,
      moves: [],
      warnings: [{ key: "shift.warning.nothingToMove" }],
      movedMinutes: 0,
      skippedMinutes: 0,
    };
  }

  const today = todayISO(input.now);
  const isToday = input.date === today;

  // The first candidate day keeps everything in place except the blocks that
  // are leaving, so a same-day move never lands on top of finished work.
  const dayStart = layoutDay(instancesOn(input.instances, input.date), {
    dayStartMinute: bounds.dayStartMinute,
  });
  const movingIds = new Set(moving.map((instance) => instance.id));
  const sameDayOccupied = occupiedIntervals(dayStart, movingIds);

  let sameDayCursor = isToday
    ? ceilToStep(Math.max(bounds.dayStartMinute, minuteOfDayFromEpoch(input.now)), 5)
    : bounds.dayStartMinute;

  const futureDates: string[] = [];
  const futureOccupied = new Map<string, Interval[]>();
  const futureCursor = new Map<string, number>();

  if (input.strategy === "move_open_to_day") {
    const target = input.targetDate;
    if (!target || target < input.date) {
      return {
        strategy: input.strategy,
        date: input.date,
        reason: input.reason ?? null,
        moves: [],
        warnings: [{ key: "shift.warning.targetBeforeToday" }],
        movedMinutes: 0,
        skippedMinutes: 0,
      };
    }
    if (target !== input.date) {
      futureDates.push(target);
    }
  } else {
    for (let offset = 1; offset <= horizon; offset += 1) {
      futureDates.push(addDays(input.date, offset));
    }
  }

  for (const date of futureDates) {
    const laid = layoutDay(instancesOn(input.instances, date), {
      dayStartMinute: bounds.dayStartMinute,
    });
    futureOccupied.set(date, occupiedIntervals(laid));
    futureCursor.set(date, bounds.dayStartMinute);
  }

  const moves: ShiftMove[] = [];
  let movedMinutes = 0;
  let unplaced = 0;

  // Same-day slotting only applies when the user asked for "next free slot", or
  // when the chosen target day is the current one.
  const allowSameDay =
    input.strategy === "move_open_to_next_slot" || input.targetDate === input.date;

  for (const instance of moving) {
    const duration = Math.max(1, instance.durationMin);

    if (allowSameDay) {
      const sameDayStart = nextFreeStart(sameDayCursor, duration, sameDayOccupied);
      if (sameDayStart + duration <= bounds.dayEndMinute) {
        sameDayOccupied.push({ start: sameDayStart, end: sameDayStart + duration });
        sameDayCursor = sameDayStart + duration;
        moves.push({
          instanceId: instance.id,
          title: instance.title,
          action: "moved",
          fromDate: instance.date,
          toDate: input.date,
          fromStart: instance.plannedStart,
          toStart: formatClock(sameDayStart),
        });
        movedMinutes += duration;
        continue;
      }
    }

    let placed = false;
    for (const date of futureDates) {
      const occupied = futureOccupied.get(date) as Interval[];
      const cursor = futureCursor.get(date) as number;
      const start = nextFreeStart(cursor, duration, occupied);

      if (start + duration > bounds.dayEndMinute) continue;

      occupied.push({ start, end: start + duration });
      futureCursor.set(date, start + duration);
      moves.push({
        instanceId: instance.id,
        title: instance.title,
        action: "moved",
        fromDate: instance.date,
        toDate: date,
        fromStart: instance.plannedStart,
        // A block that leaves its day becomes flexible again: the target day's
        // timeline places it in sequence.
        toStart: null,
      });
      movedMinutes += duration;
      placed = true;
      break;
    }

    if (!placed) unplaced += 1;
  }

  if (unplaced > 0) {
    warnings.push({ key: "shift.warning.noRoom", params: { count: unplaced } });
  }
  if (hasRunningBlock(input.instances, input.date)) {
    warnings.push({ key: "shift.warning.runningKept" });
  }

  return {
    strategy: input.strategy,
    date: input.date,
    reason: input.reason ?? null,
    moves,
    warnings,
    movedMinutes,
    skippedMinutes: 0,
  };
}

export interface ShiftContext {
  now: number;
  newId: (prefix: string) => string;
}

export interface ShiftApplication {
  upserts: BlockInstance[];
  deletes: string[];
  event: ShiftEvent;
}

function accruedSeconds(instance: BlockInstance, now: number): number {
  if (instance.status !== "running" || instance.startedAt === null) {
    return Math.max(0, instance.actualSeconds);
  }
  return Math.max(0, instance.actualSeconds) + Math.max(0, Math.floor((now - instance.startedAt) / 1000));
}

/**
 * Turns a reviewed plan into concrete row changes. Pure: the caller decides how
 * to persist `upserts` and `deletes`, and keeps `event` for the undo record.
 */
export function applyShift(
  plan: ShiftPlan,
  instances: BlockInstance[],
  context: ShiftContext,
): ShiftApplication {
  const byId = new Map(instances.map((instance) => [instance.id, instance]));
  const stamp = new Date(context.now).toISOString();

  const restoreBefore: BlockInstance[] = [];
  const upserts: BlockInstance[] = [];
  const createdInstanceIds: string[] = [];
  const orderCursor = new Map<string, number>();

  const nextOrder = (date: string): number => {
    if (!orderCursor.has(date)) {
      const highest = instances
        .filter((instance) => instance.date === date)
        .reduce((max, instance) => Math.max(max, instance.order), -1);
      orderCursor.set(date, highest + 1);
    }
    const value = orderCursor.get(date) as number;
    orderCursor.set(date, value + 1);
    return value;
  };

  // A swap exchanges positions, so it is applied as one atomic pair.
  const swapped = new Map<string, { plannedStart: string | null; order: number }>();
  if (plan.strategy === "swap" && plan.moves.length === 2) {
    const [a, b] = plan.moves;
    const first = byId.get(a.instanceId);
    const second = byId.get(b.instanceId);
    if (first && second) {
      swapped.set(first.id, { plannedStart: second.plannedStart, order: second.order });
      swapped.set(second.id, { plannedStart: first.plannedStart, order: first.order });
    }
  }

  for (const move of plan.moves) {
    const original = byId.get(move.instanceId);
    if (!original) continue;

    if (!restoreBefore.some((entry) => entry.id === original.id)) {
      restoreBefore.push({ ...original });
    }

    const banked = accruedSeconds(original, context.now);

    if (move.action === "skipped") {
      upserts.push({
        ...original,
        status: "skipped",
        startedAt: null,
        actualSeconds: banked,
        updatedAt: stamp,
      });
      continue;
    }

    const exchange = swapped.get(original.id);

    if (move.toDate === original.date) {
      upserts.push({
        ...original,
        plannedStart: exchange ? exchange.plannedStart : move.toStart,
        order: exchange ? exchange.order : original.order,
        status: "planned",
        startedAt: null,
        actualSeconds: banked,
        updatedAt: stamp,
      });
      continue;
    }

    upserts.push({
      ...original,
      status: "deferred",
      movedTo: move.toDate,
      startedAt: null,
      actualSeconds: banked,
      updatedAt: stamp,
    });

    const newId = context.newId("blk");
    createdInstanceIds.push(newId);
    upserts.push({
      ...original,
      id: newId,
      date: move.toDate,
      plannedStart: null,
      order: nextOrder(move.toDate),
      status: "planned",
      actualSeconds: 0,
      startedAt: null,
      movedFrom: original.date,
      movedTo: null,
      createdAt: stamp,
      updatedAt: stamp,
      schemaVersion: SCHEMA_VERSION,
    });
  }

  const event: ShiftEvent = {
    id: context.newId("shift"),
    date: plan.date,
    strategy: plan.strategy,
    reason: plan.reason,
    moves: plan.moves,
    restoreBefore,
    createdInstanceIds,
    undone: false,
    createdAt: stamp,
    updatedAt: stamp,
    schemaVersion: SCHEMA_VERSION,
  };

  return { upserts, deletes: [], event };
}

export interface ShiftUndo {
  upserts: BlockInstance[];
  deletes: string[];
}

/**
 * Undo is the same operation as apply: put the previous rows back and remove
 * whatever the shift created. Weekly targets are untouched either way.
 */
export function undoShift(event: ShiftEvent): ShiftUndo {
  return {
    upserts: event.restoreBefore.map((instance) => ({ ...instance })),
    deletes: [...event.createdInstanceIds],
  };
}

export function planCounts(plan: ShiftPlan): { moved: number; skipped: number; days: number } {
  const moved = plan.moves.filter((move) => move.action === "moved");
  const days = new Set(moved.filter((move) => move.toDate !== move.fromDate).map((move) => move.toDate));
  return {
    moved: moved.length,
    skipped: plan.moves.filter((move) => move.action === "skipped").length,
    days: days.size,
  };
}
