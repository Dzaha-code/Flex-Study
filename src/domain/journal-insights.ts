import { addDays, diffInDays, startOfWeek, type ISODate } from "./time";
import type { BlockInstance, Reflection } from "./types";

/**
 * What the journal screen draws above the archive: a writing map, a few
 * numbers, and the learnings people wrote down.
 *
 * Pure like the rest of the domain. "Today" is passed in, never read from the
 * clock, so the same input always draws the same picture.
 */

/** 0 = nothing written, 1–4 = how much, by word count. */
export type InkLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  date: ISODate;
  words: number;
  level: InkLevel;
  hasEntry: boolean;
  favorite: boolean;
  /** After today: drawn as empty paper, never as a missed day. */
  future: boolean;
}

/**
 * Fixed thresholds rather than quartiles of the user's own data: a quiet month
 * should look quiet, not be stretched until one short line reads as "a lot".
 * An entry with a title but no body still counts as written (level 1).
 */
export function inkLevel(words: number, hasEntry: boolean): InkLevel {
  if (!hasEntry) return 0;
  if (words < 50) return 1;
  if (words < 150) return 2;
  if (words < 300) return 3;
  return 4;
}

/**
 * A GitHub-style map: one column per week, oldest on the left, ending with the
 * week that contains `today`. Each column always has seven cells, starting on
 * the user's first weekday, so rows line up as weekdays.
 */
export function writingHeatmap(
  reflections: readonly Reflection[],
  today: ISODate,
  weeks: number,
  weekStart: 0 | 1,
): HeatCell[][] {
  const byDate = new Map<ISODate, Reflection>();
  for (const reflection of reflections) byDate.set(reflection.date, reflection);

  const lastWeek = startOfWeek(today, weekStart);
  const firstWeek = addDays(lastWeek, -7 * (Math.max(1, weeks) - 1));

  const columns: HeatCell[][] = [];
  for (let week = 0; week < Math.max(1, weeks); week += 1) {
    const column: HeatCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(firstWeek, week * 7 + day);
      const entry = byDate.get(date);
      const words = entry?.wordCount ?? 0;
      column.push({
        date,
        words,
        level: inkLevel(words, entry !== undefined),
        hasEntry: entry !== undefined,
        favorite: entry?.favorite ?? false,
        future: date > today,
      });
    }
    columns.push(column);
  }
  return columns;
}

export interface JournalStats {
  entries: number;
  totalWords: number;
  favorites: number;
  /**
   * Consecutive days with an entry, ending today, or ending yesterday when
   * today is still unwritten: an evening habit should not read as broken at
   * breakfast.
   */
  currentStreak: number;
  longestStreak: number;
  /** Rounded mean over entries; 0 with no entries. */
  averageWords: number;
}

export function journalStats(reflections: readonly Reflection[], today: ISODate): JournalStats {
  const dates = [...new Set(reflections.map((reflection) => reflection.date))].sort();
  const written = new Set(dates);

  let longestStreak = 0;
  let run = 0;
  let previous: ISODate | null = null;
  for (const date of dates) {
    run = previous !== null && diffInDays(previous, date) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }

  let cursor = written.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (written.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const totalWords = reflections.reduce((sum, reflection) => sum + reflection.wordCount, 0);
  return {
    entries: reflections.length,
    totalWords,
    favorites: reflections.filter((reflection) => reflection.favorite).length,
    currentStreak,
    longestStreak,
    averageWords: reflections.length === 0 ? 0 : Math.round(totalWords / reflections.length),
  };
}

export interface LearningItem {
  text: string;
  date: ISODate;
  reflectionId: string;
}

/** The written take-aways, newest day first, blanks dropped. */
export function recentLearnings(
  reflections: readonly Reflection[],
  limit: number,
): LearningItem[] {
  const ordered = [...reflections].sort((a, b) => b.date.localeCompare(a.date));
  const items: LearningItem[] = [];
  for (const reflection of ordered) {
    for (const learning of reflection.learnings) {
      const text = learning.trim();
      if (text === "") continue;
      items.push({ text, date: reflection.date, reflectionId: reflection.id });
      if (items.length >= limit) return items;
    }
  }
  return items;
}

export interface CategoryNoteShare {
  categoryId: string;
  count: number;
  /** 0 … 1 of all notes, for a stacked bar. */
  share: number;
}

/** How block notes spread across categories, largest first. */
export function noteShareByCategory(instances: readonly BlockInstance[]): CategoryNoteShare[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const instance of instances) {
    if (instance.note.trim() === "") continue;
    counts.set(instance.categoryId, (counts.get(instance.categoryId) ?? 0) + 1);
    total += 1;
  }
  return [...counts.entries()]
    .map(([categoryId, count]) => ({ categoryId, count, share: total === 0 ? 0 : count / total }))
    .sort((a, b) => b.count - a.count || a.categoryId.localeCompare(b.categoryId));
}
