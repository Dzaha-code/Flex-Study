import { addDays, weekDates } from "./time";
import {
  categoryProgressForWeek,
  deferralCounts,
  instancesInRange,
  type CategoryProgress,
  type DeferralCount,
} from "./targets";
import type { BlockInstance, Category, WeekStart } from "./types";

export interface WeekSuggestion {
  /** i18n message key. The UI never renders raw sentences from the domain. */
  key: string;
  params: Record<string, string | number>;
}

export interface WeekRecap {
  weekStart: string;
  dates: string[];
  perCategory: CategoryProgress[];
  plannedBlocks: number;
  doneBlocks: number;
  skippedBlocks: number;
  deferredBlocks: number;
  completionRatio: number;
  mostDeferred: DeferralCount[];
  suggestion: WeekSuggestion;
}

export interface WeekRecapInput {
  categories: Category[];
  instances: BlockInstance[];
  /** Monday (or Sunday) of the week being summarised. */
  weekStartISO: string;
}

function pickSuggestion(
  perCategory: CategoryProgress[],
  mostDeferred: DeferralCount[],
  totals: { plannedBlocks: number; doneBlocks: number; deferredBlocks: number },
): WeekSuggestion {
  const weakest = [...perCategory].sort((a, b) => a.percent - b.percent)[0];

  // A target that keeps getting postponed is a target that is too big.
  if (weakest && weakest.targetMinutes > 0 && weakest.percent < 0.6 && totals.deferredBlocks >= 2) {
    const suggested = Math.max(60, Math.round((weakest.targetMinutes * 0.7) / 15) * 15);
    return {
      key: "week.suggestion.lowerTarget",
      params: { category: weakest.name, minutes: suggested, done: weakest.doneMinutes },
    };
  }

  if (totals.plannedBlocks > 0 && totals.doneBlocks / totals.plannedBlocks >= 0.8) {
    return { key: "week.suggestion.keepRhythm", params: { done: totals.doneBlocks } };
  }

  if (mostDeferred.length > 0) {
    return {
      key: "week.suggestion.protectFirst",
      params: { count: mostDeferred[0].count, title: mostDeferred[0].title },
    };
  }

  if (totals.plannedBlocks === 0) {
    return { key: "week.suggestion.planLess", params: {} };
  }

  return { key: "week.suggestion.oneBlock", params: { planned: totals.plannedBlocks } };
}

export function weekRecap({ categories, instances, weekStartISO }: WeekRecapInput): WeekRecap {
  const weekStart = weekStartISO;
  const weekEnd = addDays(weekStart, 6);
  const inWeek = instancesInRange(instances, weekStart, weekEnd);

  const plannedBlocks = inWeek.filter(
    (instance) => instance.status !== "deferred" && instance.status !== "skipped",
  ).length;
  const doneBlocks = inWeek.filter((instance) => instance.status === "done").length;
  const skippedBlocks = inWeek.filter((instance) => instance.status === "skipped").length;
  const deferredBlocks = inWeek.filter((instance) => instance.status === "deferred").length;

  const perCategory = categoryProgressForWeek({ categories, instances, weekStartISO: weekStart });
  const mostDeferred = deferralCounts(instances, weekStart, weekEnd).slice(0, 3);

  return {
    weekStart,
    dates: weekDates(weekStart),
    perCategory,
    plannedBlocks,
    doneBlocks,
    skippedBlocks,
    deferredBlocks,
    completionRatio: plannedBlocks === 0 ? 0 : doneBlocks / plannedBlocks,
    mostDeferred,
    suggestion: pickSuggestion(perCategory, mostDeferred, {
      plannedBlocks,
      doneBlocks,
      deferredBlocks,
    }),
  };
}

export function weekOffset(weekStartISO: string, offset: number): string {
  return addDays(weekStartISO, offset * 7);
}

export type { WeekStart };
