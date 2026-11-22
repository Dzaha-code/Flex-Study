import { layoutDay, nextFreeStart, occupiedIntervals } from "./schedule";
import type { ShiftPlan } from "./shift";
import { addDays, ceilToStep, formatClock, parseClock, tryParseClock } from "./time";
import type { BlockInstance, ClockTime, ISODate, Settings } from "./types";

/**
 * Rescheduling one fixed-time block, and knowing when it is due.
 *
 * A block with a fixed start is a promise to a clock: "I start at 19:00". When
 * that minute comes and nothing has started, the app has two honest things to
 * offer — start now, or move it — and the reminder and the timeline ask the
 * same functions here so they always agree on what "late" means.
 *
 * Pure: the caller passes the date, the minute and the rows.
 */

/**
 * Where a fixed-time block stands against the clock.
 *
 * - `upcoming`: its start has not come yet
 * - `now`:      this is its start minute
 * - `late`:     its start has passed and it has not been started, but its slot
 *               has not ended
 * - `missed`:   its whole slot is over and it was never started
 *
 * `null` for anything that is not a planned fixed-time block — a floating block
 * has no start to be late for, and a started, finished or skipped one is settled.
 */
export type FixedTiming = "upcoming" | "now" | "late" | "missed";

export function fixedTiming(
  instance: BlockInstance,
  today: ISODate,
  nowMinute: number,
): FixedTiming | null {
  if (instance.status !== "planned") return null;
  const start = tryParseClock(instance.plannedStart);
  if (start === null) return null;
  if (instance.date > today) return "upcoming";
  if (instance.date < today) return "missed";
  const end = start + Math.max(1, instance.durationMin);
  if (nowMinute < start) return "upcoming";
  if (nowMinute === start) return "now";
  if (nowMinute < end) return "late";
  return "missed";
}

/** Minutes past the planned start, for "started 12 min ago" copy. 0 when not late. */
export function minutesLate(instance: BlockInstance, today: ISODate, nowMinute: number): number {
  const start = tryParseClock(instance.plannedStart);
  if (start === null || instance.date !== today) return 0;
  return Math.max(0, nowMinute - start);
}

/** Whether the reschedule action belongs on this block right now. */
export function canReschedule(instance: BlockInstance, today: ISODate, nowMinute: number): boolean {
  const timing = fixedTiming(instance, today, nowMinute);
  return timing === "late" || timing === "missed";
}

/**
 * The blocks a reminder should be raised for: today's fixed-time blocks whose
 * start has come and that nobody started yet. Earliest first, so a backlog is
 * worked through in the order it was planned.
 */
export function dueFixedBlocks(
  instances: readonly BlockInstance[],
  today: ISODate,
  nowMinute: number,
): BlockInstance[] {
  return instances
    .filter((instance) => instance.date === today)
    .filter((instance) => {
      const timing = fixedTiming(instance, today, nowMinute);
      return timing === "now" || timing === "late";
    })
    .sort((a, b) => (a.plannedStart ?? "").localeCompare(b.plannedStart ?? "") || a.order - b.order);
}

/**
 * The first free start for this block on `date`, on or after `fromMinute`,
 * rounded to five minutes and inside the day's bounds. The block itself does
 * not count as occupying anything, so moving it never collides with itself.
 * `null` when the day has no room left.
 */
export function nextFreeSlot(
  instances: readonly BlockInstance[],
  block: BlockInstance,
  date: ISODate,
  fromMinute: number,
  settings: Pick<Settings, "dayStart" | "dayEnd">,
): ClockTime | null {
  const dayStart = parseClock(settings.dayStart);
  const rawEnd = parseClock(settings.dayEnd);
  const dayEnd = rawEnd > dayStart ? rawEnd : dayStart + 12 * 60;
  const duration = Math.max(1, block.durationMin);

  const laid = layoutDay(
    instances.filter((instance) => instance.date === date),
    { dayStartMinute: dayStart },
  );
  const occupied = occupiedIntervals(laid, new Set([block.id]));
  const cursor = ceilToStep(Math.max(dayStart, fromMinute), 5);
  const start = nextFreeStart(cursor, duration, occupied);
  if (start + duration > dayEnd) return null;
  return formatClock(start);
}

export interface RescheduleOption {
  kind: "nextSlot" | "tomorrow";
  date: ISODate;
  start: ClockTime;
}

/**
 * The one-tap answers offered before the free-form date and time: the next
 * free slot today, and the same time tomorrow. Either can be missing — a full
 * evening has no slot left, and a block without a start has no "same time".
 */
export function rescheduleOptions(
  instances: readonly BlockInstance[],
  block: BlockInstance,
  today: ISODate,
  nowMinute: number,
  settings: Pick<Settings, "dayStart" | "dayEnd">,
): RescheduleOption[] {
  const options: RescheduleOption[] = [];
  const slot = nextFreeSlot(instances, block, today, nowMinute, settings);
  if (slot !== null) options.push({ kind: "nextSlot", date: today, start: slot });
  if (block.plannedStart !== null) {
    options.push({ kind: "tomorrow", date: addDays(today, 1), start: block.plannedStart });
  }
  return options;
}

/**
 * A reschedule as a shift plan, so it goes through the same apply, the same
 * audit log and the same undo as "Hari berantakan". Same day keeps the row and
 * changes its start; another day defers this row and creates the block there,
 * at the chosen time.
 */
export function planReschedule(input: {
  block: BlockInstance;
  toDate: ISODate;
  toStart: ClockTime;
  reason?: string | null;
}): ShiftPlan {
  const { block, toDate, toStart } = input;
  return {
    strategy: toDate === block.date ? "move_open_to_next_slot" : "move_open_to_day",
    date: block.date,
    reason: input.reason ?? null,
    moves: [
      {
        instanceId: block.id,
        title: block.title,
        action: "moved",
        fromDate: block.date,
        toDate,
        fromStart: block.plannedStart,
        toStart,
      },
    ],
    warnings: [],
    movedMinutes: Math.max(1, block.durationMin),
    skippedMinutes: 0,
  };
}
