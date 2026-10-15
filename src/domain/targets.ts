import { addDays, startOfWeek } from "./time";
import type { BlockInstance, Category, CategorySymbol, WeekStart } from "./types";

/**
 * Weekly targets are derived from finished `BlockInstance` rows, never from a
 * separate counter. Deferring a block does not shrink a target — it only moves
 * the opportunity.
 */
export function creditedMinutes(instance: BlockInstance): number {
  if (instance.status !== "done") return 0;
  if (instance.actualSeconds > 0) return Math.round(instance.actualSeconds / 60);
  return Math.max(0, instance.durationMin);
}

export interface CategoryProgress {
  categoryId: string;
  name: string;
  icon: CategorySymbol;
  targetMinutes: number;
  doneMinutes: number;
  doneBlocks: number;
  /** Blocks still expected to happen: planned or running. */
  plannedBlocks: number;
  /** Every block of the category in the window, postponements included. */
  totalBlocks: number;
  percent: number;
}

export interface CategoryProgressOptions {
  categories: Category[];
  instances: BlockInstance[];
  weekStartISO: string;
}

export function instancesInRange(
  instances: BlockInstance[],
  from: string,
  to: string,
): BlockInstance[] {
  return instances.filter((instance) => instance.date >= from && instance.date <= to);
}

export function categoryProgressForWeek({
  categories,
  instances,
  weekStartISO,
}: CategoryProgressOptions): CategoryProgress[] {
  const inWeek = instancesInRange(instances, weekStartISO, addDays(weekStartISO, 6));

  return [...categories]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((category) => {
      const own = inWeek.filter((instance) => instance.categoryId === category.id);
      const doneMinutes = own.reduce((sum, instance) => sum + creditedMinutes(instance), 0);
      const doneBlocks = own.filter((instance) => instance.status === "done").length;
      const target = Math.max(0, category.weeklyTargetMinutes);

      return {
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        targetMinutes: target,
        doneMinutes,
        doneBlocks,
        plannedBlocks: own.filter(
          (instance) => instance.status === "planned" || instance.status === "running",
        ).length,
        totalBlocks: own.length,
        percent: target > 0 ? Math.min(1, doneMinutes / target) : 0,
      };
    });
}

export interface DeferralCount {
  title: string;
  count: number;
}

export function deferralCounts(
  instances: BlockInstance[],
  from: string,
  to: string,
): DeferralCount[] {
  const tally = new Map<string, number>();

  for (const instance of instancesInRange(instances, from, to)) {
    if (instance.status !== "deferred" && instance.status !== "skipped") continue;
    tally.set(instance.title, (tally.get(instance.title) ?? 0) + 1);
  }

  return [...tally.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

export function weekStartFor(iso: string, weekStart: WeekStart): string {
  return startOfWeek(iso, weekStart);
}
