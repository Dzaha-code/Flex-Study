import { describe, expect, it } from "vitest";
import { groupNotesByYearMonth, hasNote, noteMatches, notePreview } from "@/domain/notes";
import { makeInstance } from "./helpers";

/** Notes are a place to read, so the archive's rules are held to, not assumed. */
describe("hasNote", () => {
  it("treats blank text as no note", () => {
    expect(hasNote({ note: "" })).toBe(false);
    expect(hasNote({ note: "   \n\t " })).toBe(false);
    expect(hasNote({ note: "x" })).toBe(true);
  });
});

describe("groupNotesByYearMonth", () => {
  it("skips blocks that carry no note", () => {
    const archive = groupNotesByYearMonth([
      makeInstance({ id: "a", date: "2026-10-14", note: "" }),
      makeInstance({ id: "b", date: "2026-10-14", note: "  " }),
      makeInstance({ id: "c", date: "2026-10-14", note: "ada" }),
    ]);

    expect(archive).toHaveLength(1);
    expect(archive[0].months).toHaveLength(1);
    expect(archive[0].months[0].entries.map((entry) => entry.id)).toEqual(["c"]);
  });

  it("puts years and months newest first", () => {
    const archive = groupNotesByYearMonth([
      makeInstance({ id: "nov", date: "2025-11-05", note: "tahun lalu" }),
      makeInstance({ id: "jan", date: "2026-01-02", note: "awal tahun" }),
      makeInstance({ id: "oct", date: "2026-10-14", note: "baru" }),
    ]);

    expect(archive.map((year) => year.year)).toEqual(["2026", "2025"]);
    expect(archive[0].months.map((month) => month.month)).toEqual(["2026-10", "2026-01"]);
    expect(archive[0].months[0].entries.map((entry) => entry.id)).toEqual(["oct"]);
    expect(archive[1].months[0].entries.map((entry) => entry.id)).toEqual(["nov"]);
  });

  it("counts each year across all of its months", () => {
    const archive = groupNotesByYearMonth([
      makeInstance({ id: "a", date: "2026-01-01", note: "satu" }),
      makeInstance({ id: "b", date: "2026-01-02", note: "dua" }),
      makeInstance({ id: "c", date: "2026-10-14", note: "tiga" }),
    ]);

    expect(archive).toHaveLength(1);
    expect(archive[0].entryCount).toBe(3);
  });

  it("does not care what order the store hands the instances over in", () => {
    const instances = [
      makeInstance({ id: "a", date: "2026-10-14", note: "alpha" }),
      makeInstance({ id: "b", date: "2026-09-30", note: "beta" }),
      makeInstance({ id: "c", date: "2025-12-31", note: "gamma" }),
    ];

    const shape = (archive: ReturnType<typeof groupNotesByYearMonth>) =>
      archive.map((year) => ({
        year: year.year,
        months: year.months.map((month) => ({
          month: month.month,
          ids: month.entries.map((entry) => entry.id),
        })),
      }));

    expect(shape(groupNotesByYearMonth(instances))).toEqual(
      shape(groupNotesByYearMonth([...instances].reverse())),
    );
  });

  it("keeps the store's own order for blocks that share a day", () => {
    const archive = groupNotesByYearMonth([
      makeInstance({ id: "first", date: "2026-10-14", note: "dulu" }),
      makeInstance({ id: "second", date: "2026-10-14", note: "kemudian" }),
    ]);

    expect(archive[0].months[0].entries.map((entry) => entry.id)).toEqual(["first", "second"]);
  });
});

describe("noteMatches", () => {
  const instance = makeInstance({
    id: "n1",
    date: "2026-10-14",
    title: "Tryout UTBK",
    note: "Skor matematika naik",
  });

  it("matches everything when the query is blank", () => {
    expect(noteMatches(instance, "")).toBe(true);
    expect(noteMatches(instance, "   ")).toBe(true);
  });

  it("matches the note text, case-insensitively", () => {
    expect(noteMatches(instance, "matematika")).toBe(true);
    expect(noteMatches(instance, "NAIK")).toBe(true);
  });

  it("matches the block title and the day", () => {
    expect(noteMatches(instance, "utbk")).toBe(true);
    expect(noteMatches(instance, "2026-10-14")).toBe(true);
    expect(noteMatches(instance, "2026")).toBe(true);
  });

  it("stays quiet about anything else", () => {
    expect(noteMatches(instance, "fisika")).toBe(false);
  });
});

describe("notePreview", () => {
  it("flattens line breaks into one line", () => {
    expect(notePreview("satu\ndua\n\n   tiga")).toBe("satu dua tiga");
  });

  it("truncates with an ellipsis instead of overflowing the row", () => {
    const preview = notePreview("x".repeat(500));
    expect(preview.length).toBeLessThanOrEqual(140);
    expect(preview.endsWith("…")).toBe(true);
  });
});
