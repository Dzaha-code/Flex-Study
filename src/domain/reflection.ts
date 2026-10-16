import { monthKey, yearKey } from "./recap";
import { weekdayIndex } from "./time";
import { SCHEMA_VERSION } from "./types";
import type { Reflection } from "./types";

/** Rotating prompts. Generic on purpose: the system knows nothing about UTBK. */
export const REFLECTION_PROMPT_IDS = [
  "reflection.prompt.win",
  "reflection.prompt.friction",
  "reflection.prompt.tomorrow",
  "reflection.prompt.energy",
  "reflection.prompt.learning",
] as const;

export type ReflectionPromptId = (typeof REFLECTION_PROMPT_IDS)[number];

export const LEARNING_SLOTS = 3;

/** Stable per date, so the prompt does not change while the user is typing. */
export function promptIdForDate(iso: string): ReflectionPromptId {
  return REFLECTION_PROMPT_IDS[weekdayIndex(iso) % REFLECTION_PROMPT_IDS.length];
}

/**
 * Word count for the journal. Latin script only, which covers both shipped
 * locales, and keeps the counter predictable while typing.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).filter((token) => /[0-9A-Za-zÀ-ÿ]/.test(token)).length;
}

/** Always exactly three slots, trimmed, never undefined. */
export function normalizeLearnings(input: readonly string[]): string[] {
  return Array.from({ length: LEARNING_SLOTS }, (_, index) => (input[index] ?? "").trim());
}

export interface ReflectionDraft {
  date: string;
  /** Optional headline; the date stands in for it when empty. */
  title: string;
  body: string;
  learnings: readonly string[];
  promptId: string | null;
  /** Left out by callers that do not touch the star, so it survives edits. */
  favorite?: boolean;
  existing?: Reflection | null;
  now: number;
  newId: (prefix: string) => string;
}

export function makeReflection(draft: ReflectionDraft): Reflection {
  const stamp = new Date(draft.now).toISOString();
  return {
    id: draft.existing?.id ?? draft.newId("refl"),
    date: draft.date,
    title: draft.title.trim(),
    promptId: draft.promptId,
    body: draft.body,
    learnings: normalizeLearnings(draft.learnings),
    wordCount: countWords(draft.body),
    // Editing the text must not clear a star, and starring must not clear text.
    favorite: draft.favorite ?? draft.existing?.favorite ?? false,
    createdAt: draft.existing?.createdAt ?? stamp,
    updatedAt: stamp,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Search across everything a person might remember about an entry: the headline
 * they gave it, what they wrote, the take-aways, and the date itself. Pure and
 * dependency-free, so the matching rule is unit-testable rather than buried in a
 * component. An empty query matches everything.
 */
export function reflectionMatches(reflection: Reflection, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [reflection.title, reflection.body, reflection.date, ...reflection.learnings]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

/** One month inside the archive. */
export interface JournalMonth {
  /** `"2026-10"`. */
  month: string;
  entries: Reflection[];
}

/** One year of the archive, with the months that hold something. */
export interface JournalYear {
  /** `"2026"`. */
  year: string;
  months: JournalMonth[];
  /** Across the whole year, so a collapsed year can still say how much it holds. */
  entryCount: number;
  favoriteCount: number;
}

/**
 * The journal archive: years newest first, each holding its months newest first.
 *
 * Grouping by month alone reads fine for a few months and badly as soon as the
 * journal crosses a year boundary, because "Oktober" and "Oktober" become
 * neighbours with nothing between them to say which year each belongs to. The
 * year is what a person reaches for first, so it is the outer layer.
 *
 * Sorting is part of the rule rather than the caller's job, so the shape is the
 * same whatever order the store hands over — and a month with no entries simply
 * does not appear, rather than showing twelve empty rows per year.
 */
export function archiveByYearMonth(reflections: readonly Reflection[]): JournalYear[] {
  const years = new Map<string, Map<string, Reflection[]>>();

  for (const reflection of [...reflections].sort((a, b) => b.date.localeCompare(a.date))) {
    const year = yearKey(reflection.date);
    const month = monthKey(reflection.date);
    let byMonth = years.get(year);
    if (!byMonth) {
      byMonth = new Map<string, Reflection[]>();
      years.set(year, byMonth);
    }
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(reflection);
    else byMonth.set(month, [reflection]);
  }

  return [...years.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([year, byMonth]) => {
      const months = [...byMonth.entries()].map(([month, entries]) => ({ month, entries }));
      return {
        year,
        months,
        entryCount: months.reduce((sum, item) => sum + item.entries.length, 0),
        favoriteCount: months.reduce(
          (sum, item) => sum + item.entries.filter((entry) => entry.favorite).length,
          0,
        ),
      };
    });
}

export function hasContent(reflection: Pick<Reflection, "body" | "learnings">): boolean {
  if (reflection.body.trim() !== "") return true;
  return reflection.learnings.some((item) => item.trim() !== "");
}

/** One-line preview for the journal list. */
export function reflectionPreview(body: string, maxLength = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
}
