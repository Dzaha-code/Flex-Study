import { describe, expect, it } from "vitest";
import {
  monthBounds,
  monthKey,
  monthRecap,
  periodRecap,
  shiftMonth,
  totalRecap,
  yearKey,
  yearRecap,
  type Recap,
} from "@/domain/recap";
import { SCHEMA_VERSION } from "@/domain/types";
import type { Reflection } from "@/domain/types";
import { STAMP, makeCategory, makeInstance } from "./helpers";

function makeReflection(partial: Partial<Reflection> & Pick<Reflection, "date">): Reflection {
  return {
    id: `refl_${partial.date}`,
    title: "",
    promptId: null,
    body: "isi",
    learnings: ["", "", ""],
    wordCount: 3,
    favorite: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: SCHEMA_VERSION,
    ...partial,
  };
}

const CATEGORY = makeCategory({ id: "study", name: "Belajar", weeklyTargetMinutes: 300 });

function options(instances: Parameters<typeof periodRecap>[0]["instances"], reflections: Reflection[] = []) {
  return { categories: [CATEGORY], instances, reflections };
}

describe("month keys", () => {
  it("slices the ISO date", () => {
    expect(monthKey("2026-10-15")).toBe("2026-10");
    expect(yearKey("2026-10-15")).toBe("2026");
  });
});

describe("monthBounds", () => {
  it("spans the whole month", () => {
    expect(monthBounds("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("knows the short months, leap years included", () => {
    expect(monthBounds("2026-02").to).toBe("2026-02-28");
    expect(monthBounds("2028-02").to).toBe("2028-02-29");
    expect(monthBounds("2026-04").to).toBe("2026-04-30");
  });

  it("does not roll December into the next year", () => {
    expect(monthBounds("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", 12)).toBe("2027-10");
    expect(shiftMonth("2026-10", -12)).toBe("2025-10");
  });
});

describe("monthRecap", () => {
  const month = "2026-10"; // 31 days

  it("credits only finished blocks", () => {
    const recap = monthRecap(
      options([
        makeInstance({ id: "a", date: "2026-10-05", status: "done" }),
        makeInstance({ id: "b", date: "2026-10-06", status: "planned" }),
      ]),
      month,
    );

    expect(recap.doneMinutes).toBe(60);
    expect(recap.doneBlocks).toBe(1);
    expect(recap.plannedBlocks).toBe(1);
  });

  it("prefers the measured seconds over the planned duration", () => {
    const recap = monthRecap(
      options([
        // 1500 s = 25 min, even though the block was planned for 60.
        makeInstance({ id: "a", date: "2026-10-05", status: "done", actualSeconds: 1_500 }),
      ]),
      month,
    );

    expect(recap.doneMinutes).toBe(25);
  });

  it("pro-rates the weekly target by the length of the month", () => {
    const recap = monthRecap(options([]), month);
    // 300 min/week over 31 days.
    expect(recap.byCategory[0].targetMinutes).toBe(Math.round(300 * (31 / 7)));
    // A four-week month asks for less than a four-and-a-half-week one.
    expect(monthRecap(options([]), "2026-02").byCategory[0].targetMinutes).toBe(
      Math.round(300 * (28 / 7)),
    );
  });

  it("ignores blocks outside the month", () => {
    const recap = monthRecap(
      options([
        makeInstance({ id: "a", date: "2026-09-30", status: "done" }),
        makeInstance({ id: "b", date: "2026-11-01", status: "done" }),
      ]),
      month,
    );

    expect(recap.doneBlocks).toBe(0);
  });

  it("counts active days and the longest run inside the month", () => {
    const recap = monthRecap(
      options([
        makeInstance({ id: "a", date: "2026-10-01", status: "done" }),
        makeInstance({ id: "b", date: "2026-10-02", status: "done" }),
        makeInstance({ id: "c", date: "2026-10-03", status: "done" }),
        // 4 October is a gap.
        makeInstance({ id: "d", date: "2026-10-05", status: "done" }),
        // A planned block on a day is not an active day.
        makeInstance({ id: "e", date: "2026-10-07", status: "planned" }),
      ]),
      month,
    );

    expect(recap.activeDays).toBe(4);
    expect(recap.longestStreak).toBe(3);
  });

  it("summarises the journal of the month", () => {
    const recap = monthRecap(
      options([], [
        makeReflection({ date: "2026-10-02", wordCount: 40, favorite: true }),
        makeReflection({ date: "2026-10-03", wordCount: 60 }),
        makeReflection({ date: "2026-11-03", wordCount: 999 }),
      ]),
      month,
    );

    expect(recap.journalEntries).toBe(2);
    expect(recap.journalWords).toBe(100);
    expect(recap.favoriteEntries).toBe(1);
  });

  it("reports how many blocks were put off", () => {
    const recap = monthRecap(
      options([
        makeInstance({ id: "a", date: "2026-10-05", status: "deferred" }),
        makeInstance({ id: "b", date: "2026-10-06", status: "skipped" }),
        makeInstance({ id: "c", date: "2026-10-07", status: "skipped" }),
      ]),
      month,
    );

    expect(recap.deferredBlocks).toBe(1);
    expect(recap.skippedBlocks).toBe(2);
  });
});

describe("yearRecap", () => {
  it("returns twelve months, January first", () => {
    const months = yearRecap(options([]), "2026");

    expect(months).toHaveLength(12);
    expect(months[0].from).toBe("2026-01-01");
    expect(months[11].to).toBe("2026-12-31");
    expect(months.map((entry) => entry.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("keeps each month's blocks in that month", () => {
    const months = yearRecap(
      options([
        makeInstance({ id: "a", date: "2026-03-10", status: "done" }),
        makeInstance({ id: "b", date: "2026-08-20", status: "done" }),
      ]),
      "2026",
    );

    expect(months[2].doneMinutes).toBe(60);
    expect(months[7].doneMinutes).toBe(60);
    expect(months[0].doneMinutes).toBe(0);
  });
});

describe("totalRecap", () => {
  it("adds the months up and recomputes the percentage", () => {
    const months = yearRecap(
      options([
        makeInstance({ id: "a", date: "2026-03-10", status: "done" }),
        makeInstance({ id: "b", date: "2026-08-20", status: "done" }),
      ]),
      "2026",
    );

    const total = totalRecap(months, "2026");

    expect(total.doneMinutes).toBe(120);
    expect(total.targetMinutes).toBe(
      months.reduce((sum, entry) => sum + entry.targetMinutes, 0),
    );
    expect(total.byCategory[0].percent).toBeCloseTo(120 / total.targetMinutes, 6);
    expect(total.from).toBe("2026-01-01");
    expect(total.to).toBe("2026-12-31");
  });

  it("takes the best month's streak rather than adding streaks up", () => {
    const months: Recap[] = yearRecap(options([]), "2026").map((entry, index) =>
      index === 4 ? { ...entry, longestStreak: 9 } : entry,
    );

    expect(totalRecap(months, "2026").longestStreak).toBe(9);
  });
});
