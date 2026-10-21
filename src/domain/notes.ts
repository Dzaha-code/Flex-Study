import { reflectionPreview } from "./reflection";
import { monthKey, yearKey } from "./recap";
import type { BlockInstance } from "./types";

/**
 * Block notes as a first-class place to read them, not a string hidden inside
 * a timer. A note written during focus is worth more than the block it was
 * written on: the timer is gone by the time it is needed again, and opening
 * every block to find one line is not reading, it is archaeology.
 *
 * Everything here is pure and time-free, mirroring `reflection.ts`: the same
 * year → month grouping the journal archive uses, so both archives read the
 * same way and neither has to teach the other's shape to the UI.
 */

/** A block worth showing in the notes list: it carries a non-blank note. */
export function hasNote(instance: Pick<BlockInstance, "note">): boolean {
  return instance.note.trim() !== "";
}

/** One month of notes. */
export interface NotesMonth {
  /** `"2026-10"`. */
  month: string;
  entries: BlockInstance[];
}

/** One year of notes, with the months that hold something. */
export interface NotesYear {
  /** `"2026"`. */
  year: string;
  months: NotesMonth[];
  /** Across the whole year, so a collapsed year can still say how much it holds. */
  entryCount: number;
}

/**
 * The notes archive: years newest first, each holding its months newest first,
 * entries newest first within a month.
 *
 * Same rules as `archiveByYearMonth` in the journal, deliberately: the year is
 * the outer layer because "Oktober, Oktober" with nothing between them says
 * nothing; sorting is part of the rule rather than the caller's job, so the
 * shape is the same whatever order the store hands over; and a day without a
 * note simply does not appear.
 *
 * The grouping key is the block's day, not the moment its note was last
 * changed: a note belongs to the study session it was written in. Within one
 * day the store's own order is kept (a stable sort on the date alone).
 */
export function groupNotesByYearMonth(instances: readonly BlockInstance[]): NotesYear[] {
  const years = new Map<string, Map<string, BlockInstance[]>>();

  for (const instance of [...instances]
    .filter(hasNote)
    .sort((a, b) => b.date.localeCompare(a.date))) {
    const year = yearKey(instance.date);
    const month = monthKey(instance.date);
    let byMonth = years.get(year);
    if (!byMonth) {
      byMonth = new Map<string, BlockInstance[]>();
      years.set(year, byMonth);
    }
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(instance);
    else byMonth.set(month, [instance]);
  }

  return [...years.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([year, byMonth]) => {
      const months = [...byMonth.entries()].map(([month, entries]) => ({ month, entries }));
      return {
        year,
        months,
        entryCount: months.reduce((sum, item) => sum + item.entries.length, 0),
      };
    });
}

/**
 * Search across both things a person might half-remember: what they wrote, and
 * the block they wrote it on (its title and its day). Pure and dependency-free,
 * so the matching rule is unit-testable. An empty query matches everything —
 * the caller then still filters for blocks that carry a note at all.
 */
export function noteMatches(instance: BlockInstance, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [instance.title, instance.note, instance.date].join("\n").toLowerCase();
  return haystack.includes(needle);
}

/** One-line preview of a note for the list. Same flattening as the journal's. */
export function notePreview(note: string, maxLength = 140): string {
  return reflectionPreview(note, maxLength);
}
