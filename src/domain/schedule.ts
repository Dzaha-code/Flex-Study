import { clampMinuteOfDay, parseClock } from "./time";
import type { BlockInstance } from "./types";

export interface Interval {
  start: number;
  end: number;
}

export interface LaidOutBlock {
  instance: BlockInstance;
  startMinute: number;
  endMinute: number;
  /** True when the block was pinned to a clock time by the user. */
  fixed: boolean;
  /** True when a pinned start collides with an earlier pinned block. */
  overlap: boolean;
}

export interface LayoutOptions {
  dayStartMinute: number;
  dayEndMinute?: number;
}

/** Blocks that still hold a place in the day's timeline. */
export function occupiesTimeline(instance: BlockInstance): boolean {
  return instance.status === "planned" || instance.status === "running" || instance.status === "done";
}

function collides(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Earliest minute at or after `cursor` where a block of `duration` minutes fits
 * without colliding with `occupied`.
 *
 * Shared by the timeline layout and the reschedule engine so both agree on what
 * "the next free slot" means.
 */
export function nextFreeStart(cursor: number, duration: number, occupied: Interval[]): number {
  const span = Math.max(1, duration);
  let minute = Math.max(0, Math.round(cursor));

  for (let guard = 0; guard < 256; guard += 1) {
    const covering = occupied.find((slot) => slot.start <= minute && minute < slot.end);
    if (covering) {
      minute = covering.end;
      continue;
    }
    const blocking = occupied.filter((slot) => slot.start > minute && slot.start < minute + span);
    if (blocking.length > 0) {
      minute = Math.max(...blocking.map((slot) => slot.end));
      continue;
    }
    return minute;
  }

  return minute;
}

/**
 * Places every block of a day on the clock.
 *
 * Blocks with a fixed start keep it. Blocks without one flow in sequence from
 * the day's start time, skipping past anything already claimed — so a timeline
 * never lies about when work happens.
 */
export function layoutDay(instances: BlockInstance[], options: LayoutOptions): LaidOutBlock[] {
  const active = instances.filter(occupiesTimeline);
  const occupied: Interval[] = [];
  const placed: LaidOutBlock[] = [];

  const fixed = active
    .filter((instance) => instance.plannedStart !== null)
    .map((instance) => ({ instance, start: parseClock(instance.plannedStart as string) }))
    .sort(
      (a, b) =>
        a.start - b.start ||
        a.instance.order - b.instance.order ||
        a.instance.id.localeCompare(b.instance.id),
    );

  for (const entry of fixed) {
    const end = entry.start + Math.max(1, entry.instance.durationMin);
    const overlap = occupied.some((slot) => collides(slot, { start: entry.start, end }));
    occupied.push({ start: entry.start, end });
    placed.push({
      instance: entry.instance,
      startMinute: entry.start,
      endMinute: end,
      fixed: true,
      overlap,
    });
  }

  const floating = active
    .filter((instance) => instance.plannedStart === null)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  let cursor = clampMinuteOfDay(options.dayStartMinute);
  for (const instance of floating) {
    const duration = Math.max(1, instance.durationMin);
    const start = nextFreeStart(cursor, duration, occupied);
    const end = start + duration;
    occupied.push({ start, end });
    placed.push({ instance, startMinute: start, endMinute: end, fixed: false, overlap: false });
    cursor = end;
  }

  return placed.sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      a.instance.order - b.instance.order ||
      a.instance.id.localeCompare(b.instance.id),
  );
}

/**
 * The block the screen should lead with: whatever is running, then whatever the
 * clock is inside right now, then the next one coming up.
 */
export function focusBlock(blocks: LaidOutBlock[], nowMinute: number): LaidOutBlock | null {
  const running = blocks.find((block) => block.instance.status === "running");
  if (running) return running;

  const planned = blocks.filter((block) => block.instance.status === "planned");
  const inside = planned
    .filter((block) => block.startMinute <= nowMinute && nowMinute < block.endMinute)
    .sort((a, b) => a.startMinute - b.startMinute);
  if (inside.length > 0) return inside[0];

  const upcoming = planned
    .filter((block) => block.startMinute > nowMinute)
    .sort((a, b) => a.startMinute - b.startMinute);
  if (upcoming.length > 0) return upcoming[0];

  return planned[0] ?? null;
}

export function dayBounds(blocks: LaidOutBlock[]): Interval | null {
  if (blocks.length === 0) return null;
  return {
    start: Math.min(...blocks.map((block) => block.startMinute)),
    end: Math.max(...blocks.map((block) => block.endMinute)),
  };
}

/** Intervals a day's timeline already claims, used when slotting new work in. */
export function occupiedIntervals(blocks: LaidOutBlock[], excludeIds: Set<string> = new Set()): Interval[] {
  return blocks
    .filter((block) => !excludeIds.has(block.instance.id))
    .map((block) => ({ start: block.startMinute, end: block.endMinute }));
}
