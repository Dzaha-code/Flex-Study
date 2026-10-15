import { addDays } from "./time";
import { creditedMinutes, instancesInRange } from "./targets";
import type { BlockInstance, Category, CategorySymbol, Reflection } from "./types";

/**
 * Month- and year-level summaries — the "report card" the Today screen
 * deliberately does not become.
 *
 * Today stays a seven-day view. This module answers the slower question ("how
 * did this month actually go?") without pushing anything new onto the daily
 * screen. Everything here is pure: explicit arguments, no clock, no storage, so
 * it is cheap to test and can later be read by an agent over the same data.
 *
 * One rule is deliberately borrowed from the weekly targets: minutes are
 * *credited*, not planned. A block counts only once it is `done`, and it counts
 * what was actually measured when a timer ran.
 */

/** `"2026-10-15"` → `"2026-10"`. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** `"2026-10-15"` → `"2026"`. */
export function yearKey(iso: string): string {
  return iso.slice(0, 4);
}

/**
 * First and last day of a `"YYYY-MM"` period.
 *
 * Day 0 of the following month is the last day of this one, computed in UTC so
 * the answer never depends on the machine's timezone or on DST.
 */
export function monthBounds(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(days).padStart(2, "0")}` };
}

/** Steps a `"YYYY-MM"` key by whole months, without touching a clock. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = year * 12 + (monthNumber - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (((total % 12) + 12) % 12) + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

export interface CategoryRecap {
  categoryId: string;
  name: string;
  icon: CategorySymbol;
  doneMinutes: number;
  /** The weekly target scaled to the length of the period. */
  targetMinutes: number;
  doneBlocks: number;
  percent: number;
}

/** Finished minutes as a share of the period's target, capped at 1. */
export function percentOf(doneMinutes: number, targetMinutes: number): number {
  return targetMinutes > 0 ? Math.min(1, doneMinutes / targetMinutes) : 0;
}

export interface Recap {
  /** `"YYYY-MM"` for a month, or the label given to a folded period. */
  month: string;
  from: string;
  to: string;
  doneMinutes: number;
  targetMinutes: number;
  /** `doneMinutes` against `targetMinutes`, capped at 1. */
  percent: number;
  doneBlocks: number;
  /** Still expected to happen: planned or running. */
  plannedBlocks: number;
  deferredBlocks: number;
  skippedBlocks: number;
  /** Days with at least one finished block. */
  activeDays: number;
  /** Longest run of consecutive active days inside the period. */
  longestStreak: number;
  journalEntries: number;
  journalWords: number;
  favoriteEntries: number;
  byCategory: CategoryRecap[];
}

export interface RecapOptions {
  categories: Category[];
  instances: BlockInstance[];
  reflections: Reflection[];
}

function longestStreakOf(dates: string[], active: Set<string>): number {
  let best = 0;
  let run = 0;
  for (const date of dates) {
    run = active.has(date) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** Every day from `from` to `to`, inclusive. */
function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

export function periodRecap(options: RecapOptions, from: string, to: string): Recap {
  const { categories, instances, reflections } = options;
  const window = instancesInRange(instances, from, to);
  const dates = datesBetween(from, to);
  const active = new Set(
    window.filter((instance) => instance.status === "done").map((instance) => instance.date),
  );

  // A period's target is the weekly target pro-rated by its length, so a 31-day
  // month asks for more than a 28-day one and the comparison stays honest.
  const weeks = dates.length / 7;

  const byCategory: CategoryRecap[] = [...categories]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((category) => {
      const own = window.filter((instance) => instance.categoryId === category.id);
      const doneMinutes = own.reduce((sum, instance) => sum + creditedMinutes(instance), 0);
      const targetMinutes = Math.round(Math.max(0, category.weeklyTargetMinutes) * weeks);
      return {
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        doneMinutes,
        targetMinutes,
        doneBlocks: own.filter((instance) => instance.status === "done").length,
        percent: percentOf(doneMinutes, targetMinutes),
      };
    });

  const periodReflections = reflections.filter(
    (reflection) => reflection.date >= from && reflection.date <= to,
  );

  const sum = (pick: (recap: CategoryRecap) => number) =>
    byCategory.reduce((total, entry) => total + pick(entry), 0);

  const doneMinutes = sum((entry) => entry.doneMinutes);
  const targetMinutes = sum((entry) => entry.targetMinutes);

  return {
    month: monthKey(from),
    from,
    to,
    doneMinutes,
    targetMinutes,
    percent: percentOf(doneMinutes, targetMinutes),
    doneBlocks: window.filter((instance) => instance.status === "done").length,
    plannedBlocks: window.filter(
      (instance) => instance.status === "planned" || instance.status === "running",
    ).length,
    deferredBlocks: window.filter((instance) => instance.status === "deferred").length,
    skippedBlocks: window.filter((instance) => instance.status === "skipped").length,
    activeDays: active.size,
    longestStreak: longestStreakOf(dates, active),
    journalEntries: periodReflections.length,
    journalWords: periodReflections.reduce((total, item) => total + item.wordCount, 0),
    favoriteEntries: periodReflections.filter((item) => item.favorite).length,
    byCategory,
  };
}

export function monthRecap(options: RecapOptions, month: string): Recap {
  const { from, to } = monthBounds(month);
  return periodRecap(options, from, to);
}

/** Twelve months of one year, January first — ready for a table. */
export function yearRecap(options: RecapOptions, year: string): Recap[] {
  return Array.from({ length: 12 }, (_, index) =>
    monthRecap(options, `${year}-${String(index + 1).padStart(2, "0")}`),
  );
}

/**
 * Folds monthly recaps into one row so a year can have a header.
 *
 * The streak is the best month rather than a sum: summing streaks would count
 * the same days twice, and re-deriving a true year-long run would need the day
 * sets rather than the summaries.
 */
export function totalRecap(recaps: Recap[], label: string): Recap {
  const byCategory = new Map<string, CategoryRecap>();
  const totals = {
    doneMinutes: 0,
    targetMinutes: 0,
    doneBlocks: 0,
    plannedBlocks: 0,
    deferredBlocks: 0,
    skippedBlocks: 0,
    activeDays: 0,
    longestStreak: 0,
    journalEntries: 0,
    journalWords: 0,
    favoriteEntries: 0,
  };

  for (const recap of recaps) {
    totals.doneMinutes += recap.doneMinutes;
    totals.targetMinutes += recap.targetMinutes;
    totals.doneBlocks += recap.doneBlocks;
    totals.plannedBlocks += recap.plannedBlocks;
    totals.deferredBlocks += recap.deferredBlocks;
    totals.skippedBlocks += recap.skippedBlocks;
    totals.activeDays += recap.activeDays;
    totals.longestStreak = Math.max(totals.longestStreak, recap.longestStreak);
    totals.journalEntries += recap.journalEntries;
    totals.journalWords += recap.journalWords;
    totals.favoriteEntries += recap.favoriteEntries;

    for (const entry of recap.byCategory) {
      const current = byCategory.get(entry.categoryId);
      if (!current) {
        byCategory.set(entry.categoryId, { ...entry });
        continue;
      }
      current.doneMinutes += entry.doneMinutes;
      current.targetMinutes += entry.targetMinutes;
      current.doneBlocks += entry.doneBlocks;
      current.percent = percentOf(current.doneMinutes, current.targetMinutes);
    }
  }

  return {
    month: label,
    from: recaps[0]?.from ?? "",
    to: recaps[recaps.length - 1]?.to ?? "",
    ...totals,
    percent: percentOf(totals.doneMinutes, totals.targetMinutes),
    byCategory: [...byCategory.values()],
  };
}
