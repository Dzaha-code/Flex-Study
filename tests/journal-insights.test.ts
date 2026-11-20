import { describe, expect, it } from "vitest";
import {
  inkLevel,
  journalStats,
  noteShareByCategory,
  recentLearnings,
  writingHeatmap,
} from "@/domain/journal-insights";
import type { Reflection } from "@/domain/types";
import { makeInstance, STAMP } from "./helpers";

// 2026-10-22 is a Thursday.
const TODAY = "2026-10-22";

function entry(date: string, partial: Partial<Reflection> = {}): Reflection {
  return {
    id: `r-${date}`,
    date,
    title: "",
    promptId: null,
    body: "",
    learnings: ["", "", ""],
    wordCount: 0,
    favorite: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: 1,
    ...partial,
  };
}

describe("inkLevel", () => {
  it("is empty without an entry and grows with the word count", () => {
    expect(inkLevel(0, false)).toBe(0);
    expect(inkLevel(0, true)).toBe(1);
    expect(inkLevel(80, true)).toBe(2);
    expect(inkLevel(200, true)).toBe(3);
    expect(inkLevel(900, true)).toBe(4);
  });
});

describe("writingHeatmap", () => {
  it("ends on the week holding today, seven rows per column, Monday first", () => {
    const map = writingHeatmap([entry(TODAY, { wordCount: 120 })], TODAY, 4, 1);
    expect(map).toHaveLength(4);
    for (const column of map) expect(column).toHaveLength(7);

    const last = map[3];
    expect(last[0]?.date).toBe("2026-10-19"); // Monday
    const today = last.find((cell) => cell.date === TODAY);
    expect(today).toMatchObject({ hasEntry: true, level: 2, future: false });
    // Friday to Sunday have not happened yet.
    expect(last.slice(4).every((cell) => cell.future)).toBe(true);
  });

  it("can start the week on Sunday", () => {
    const map = writingHeatmap([], TODAY, 1, 0);
    expect(map[0]?.[0]?.date).toBe("2026-10-18");
  });
});

describe("journalStats", () => {
  it("counts a streak that ends yesterday while today is still unwritten", () => {
    const stats = journalStats(
      [
        entry("2026-10-19", { wordCount: 100, favorite: true }),
        entry("2026-10-20", { wordCount: 50 }),
        entry("2026-10-21", { wordCount: 30 }),
        entry("2026-10-10", { wordCount: 20 }),
      ],
      TODAY,
    );
    expect(stats).toEqual({
      entries: 4,
      totalWords: 200,
      favorites: 1,
      currentStreak: 3,
      longestStreak: 3,
      averageWords: 50,
    });
  });

  it("drops the streak to zero after a missed day", () => {
    const stats = journalStats([entry("2026-10-20")], TODAY);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(1);
  });

  it("is all zeros with no entries", () => {
    expect(journalStats([], TODAY)).toMatchObject({ entries: 0, averageWords: 0, currentStreak: 0 });
  });
});

describe("recentLearnings", () => {
  it("lists take-aways newest first and skips blanks", () => {
    const items = recentLearnings(
      [
        entry("2026-10-20", { learnings: ["lama", "", ""] }),
        entry("2026-10-21", { learnings: ["baru 1", " baru 2 ", ""] }),
      ],
      2,
    );
    expect(items.map((item) => item.text)).toEqual(["baru 1", "baru 2"]);
  });
});

describe("noteShareByCategory", () => {
  it("counts only blocks that carry a note, largest share first", () => {
    const shares = noteShareByCategory([
      makeInstance({ id: "a", date: TODAY, categoryId: "study", note: "x" }),
      makeInstance({ id: "b", date: TODAY, categoryId: "study", note: "y" }),
      makeInstance({ id: "c", date: TODAY, categoryId: "project", note: "z" }),
      makeInstance({ id: "d", date: TODAY, categoryId: "project", note: "  " }),
    ]);
    expect(shares).toEqual([
      { categoryId: "study", count: 2, share: 2 / 3 },
      { categoryId: "project", count: 1, share: 1 / 3 },
    ]);
  });
});
