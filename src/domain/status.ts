import type { LaidOutBlock } from "./schedule";
import type { BlockInstance, BlockStatus } from "./types";

export const BLOCK_STATUSES: readonly BlockStatus[] = [
  "planned",
  "running",
  "paused",
  "done",
  "deferred",
  "skipped",
];

/** Started or not — the block still wants attention today. */
export function isOpen(status: BlockStatus): boolean {
  return status === "planned" || status === "running" || status === "paused";
}

/** Permanently settled: counted or consciously dropped. */
export function isSettled(status: BlockStatus): boolean {
  return status === "done" || status === "skipped";
}

export function canStart(status: BlockStatus): boolean {
  return status === "planned";
}

export function canComplete(status: BlockStatus): boolean {
  return status === "running";
}

/** Anything other than a fresh block can be returned to "planned". */
export function canReset(status: BlockStatus): boolean {
  return status !== "planned";
}

/**
 * Pausing belongs to flexible blocks only (updateBrief.md: "jadwal yang tidak
 * di-fixed bisa di-pause"). A fixed-time block is bound to its slot on the
 * clock: freezing its countdown would still leave the slot claimed, so the
 * honest move there is to move or finish the block, not to pause it.
 */
export function canPause(instance: BlockInstance): boolean {
  return instance.status === "running" && instance.plannedStart === null;
}

export function canResume(instance: BlockInstance): boolean {
  return instance.status === "paused";
}

export function elapsedSeconds(instance: BlockInstance, nowEpoch: number): number {
  if (instance.status !== "running" || instance.startedAt === null) return 0;
  return Math.max(0, Math.floor((nowEpoch - instance.startedAt) / 1000));
}

/**
 * Measured time so far: banked seconds plus the timer currently running.
 *
 * A paused block has already banked its seconds (the pause wrote them into
 * `actualSeconds`), and `elapsedSeconds` reads zero for it — so the countdown
 * freezes exactly where it stopped without any special case here.
 */
export function totalSeconds(instance: BlockInstance, nowEpoch: number): number {
  return Math.max(0, instance.actualSeconds) + elapsedSeconds(instance, nowEpoch);
}

export function budgetSeconds(instance: BlockInstance): number {
  return Math.max(1, instance.durationMin) * 60;
}

export function remainingSeconds(instance: BlockInstance, nowEpoch: number): number {
  return Math.max(0, budgetSeconds(instance) - totalSeconds(instance, nowEpoch));
}

/** 0 … 1, for the per-block progress rule. */
export function progressRatio(instance: BlockInstance, nowEpoch: number): number {
  return Math.min(1, totalSeconds(instance, nowEpoch) / budgetSeconds(instance));
}

export interface DayProgress {
  totalCount: number;
  doneCount: number;
  totalMinutes: number;
  doneMinutes: number;
  remainingMinutes: number;
  ratio: number;
}

/**
 * The single honest status line for the day.
 *
 * Deferred and skipped blocks are already excluded from `blocks`, so what is
 * left is what still holds time on the clock.
 */
export function dayProgress(blocks: LaidOutBlock[], nowMinute: number): DayProgress {
  let totalMinutes = 0;
  let doneMinutes = 0;
  let remainingMinutes = 0;
  let doneCount = 0;

  for (const block of blocks) {
    const duration = Math.max(1, block.instance.durationMin);
    totalMinutes += duration;

    if (block.instance.status === "done") {
      doneCount += 1;
      doneMinutes += duration;
      continue;
    }

    if (block.instance.status === "running") {
      remainingMinutes += Math.max(0, Math.min(duration, block.endMinute - nowMinute));
      continue;
    }

    remainingMinutes += duration;
  }

  const totalCount = blocks.length;
  return {
    totalCount,
    doneCount,
    totalMinutes,
    doneMinutes,
    remainingMinutes,
    ratio: totalCount === 0 ? 0 : doneCount / totalCount,
  };
}
