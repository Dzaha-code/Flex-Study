import { describe, expect, it } from "vitest";
import { layoutDay } from "@/domain/schedule";
import {
  canComplete,
  canReset,
  canStart,
  dayProgress,
  remainingSeconds,
  totalSeconds,
} from "@/domain/status";
import { categoryProgressForWeek, deferralCounts } from "@/domain/targets";
import { weekRecap } from "@/domain/week";
import { makeCategory, makeInstance } from "./helpers";

const DAY = "2026-10-14";
const WEEK_START = "2026-10-12";

describe("dayProgress", () => {
  const blocks = layoutDay(
    [
      makeInstance({ id: "d1", date: DAY, status: "done", order: 0 }),
      makeInstance({ id: "d2", date: DAY, status: "done", order: 1 }),
      makeInstance({ id: "p1", date: DAY, order: 2, durationMin: 45 }),
      makeInstance({ id: "run", date: DAY, status: "running", order: 3, durationMin: 90 }),
    ],
    { dayStartMinute: 480 },
  );

  it("counts finished blocks and the time that is left", () => {
    const progress = dayProgress(blocks, 700);

    expect(progress.totalCount).toBe(4);
    expect(progress.doneCount).toBe(2);
    expect(progress.doneMinutes).toBe(120);
    expect(progress.remainingMinutes).toBe(80);
    expect(progress.ratio).toBe(0.5);
  });

  it("shrinks the running block's remainder as the clock moves", () => {
    expect(dayProgress(blocks, 700).remainingMinutes).toBe(80);
    expect(dayProgress(blocks, 735).remainingMinutes).toBe(45);
  });

  it("handles an empty day", () => {
    const progress = dayProgress([], 700);
    expect(progress.totalCount).toBe(0);
    expect(progress.ratio).toBe(0);
  });
});

describe("block status rules", () => {
  it("only lets a fresh block start", () => {
    expect(canStart("planned")).toBe(true);
    expect(canStart("running")).toBe(false);
    expect(canStart("done")).toBe(false);
  });

  it("only lets a running block be completed", () => {
    expect(canComplete("running")).toBe(true);
    expect(canComplete("planned")).toBe(false);
  });

  it("lets anything that is not fresh be reset", () => {
    expect(canReset("planned")).toBe(false);
    expect(canReset("done")).toBe(true);
    expect(canReset("deferred")).toBe(true);
  });
});

describe("timer arithmetic", () => {
  it("adds banked seconds to the running timer", () => {
    const instance = makeInstance({
      id: "run",
      date: DAY,
      status: "running",
      startedAt: 1_000_000,
      actualSeconds: 30,
      durationMin: 60,
    });

    expect(totalSeconds(instance, 1_060_000)).toBe(90);
    expect(remainingSeconds(instance, 1_060_000)).toBe(3510);
  });

  it("counts nothing when the block is not running", () => {
    const instance = makeInstance({ id: "p", date: DAY, status: "planned", startedAt: 1_000_000 });
    expect(totalSeconds(instance, 2_000_000)).toBe(0);
  });

  it("survives a sleeping tab by measuring the difference", () => {
    const instance = makeInstance({
      id: "run",
      date: DAY,
      status: "running",
      startedAt: 0,
      durationMin: 600,
    });

    // Tab slept for two hours; the timer must reflect elapsed wall time.
    expect(totalSeconds(instance, 7_200_000)).toBe(7200);
  });
});

describe("category targets", () => {
  const categories = [
    makeCategory({ id: "study", weeklyTargetMinutes: 900, order: 0 }),
    makeCategory({ id: "project", weeklyTargetMinutes: 450, order: 1 }),
  ];

  const instances = [
    makeInstance({ id: "s1", date: "2026-10-13", categoryId: "study", status: "done", durationMin: 90, actualSeconds: 5400 }),
    makeInstance({ id: "s2", date: DAY, categoryId: "study", order: 1 }),
    makeInstance({ id: "s3", date: DAY, categoryId: "study", order: 2, status: "deferred", title: "Sesi belajar 2" }),
    makeInstance({ id: "p1", date: "2026-10-14", categoryId: "project", status: "done", durationMin: 60 }),
  ];

  it("sums only work that is finished inside the week", () => {
    const progress = categoryProgressForWeek({ categories, instances, weekStartISO: WEEK_START });
    const study = progress.find((entry) => entry.categoryId === "study");
    const project = progress.find((entry) => entry.categoryId === "project");

    expect(study?.doneMinutes).toBe(90);
    expect(study?.doneBlocks).toBe(1);
    expect(study?.percent).toBeCloseTo(0.1, 5);
    expect(project?.doneMinutes).toBe(60);
  });

  it("ignores blocks outside the week", () => {
    const outside = [
      ...instances,
      makeInstance({ id: "old", date: "2026-10-21", categoryId: "study", status: "done", durationMin: 300 }),
    ];

    const progress = categoryProgressForWeek({ categories, instances: outside, weekStartISO: WEEK_START });
    expect(progress.find((entry) => entry.categoryId === "study")?.doneMinutes).toBe(90);
  });

  it("counts what keeps getting postponed", () => {
    const counts = deferralCounts(instances, WEEK_START, "2026-10-18");
    expect(counts).toEqual([{ title: "Sesi belajar 2", count: 1 }]);
  });
});

describe("weekRecap", () => {
  const categories = [makeCategory({ id: "study", name: "Belajar ujian", weeklyTargetMinutes: 900 })];

  it("suggests protecting the block that keeps slipping", () => {
    const instances = [
      makeInstance({ id: "s1", date: "2026-10-13", status: "done", durationMin: 90 }),
      makeInstance({ id: "s2", date: DAY, order: 1 }),
      makeInstance({ id: "s3", date: DAY, order: 2, status: "deferred", title: "Sesi belajar 2" }),
    ];

    const recap = weekRecap({ categories, instances, weekStartISO: WEEK_START });

    expect(recap.plannedBlocks).toBe(2);
    expect(recap.doneBlocks).toBe(1);
    expect(recap.deferredBlocks).toBe(1);
    expect(recap.dates).toHaveLength(7);
    expect(recap.suggestion.key).toBe("week.suggestion.protectFirst");
    expect(recap.suggestion.params.count).toBe(1);
  });

  it("suggests a smaller target when a category is consistently postponed", () => {
    const instances = [
      makeInstance({ id: "s1", date: DAY, status: "deferred", title: "Sesi belajar 2" }),
      makeInstance({ id: "s2", date: DAY, status: "deferred", title: "Sesi belajar 1", order: 1 }),
    ];

    const recap = weekRecap({ categories, instances, weekStartISO: WEEK_START });

    expect(recap.suggestion.key).toBe("week.suggestion.lowerTarget");
    expect(recap.suggestion.params.minutes).toBe(630);
    expect(recap.suggestion.params.category).toBe("Belajar ujian");
  });

  it("acknowledges a week that went well", () => {
    const instances = [
      makeInstance({ id: "s1", date: DAY, status: "done", durationMin: 120 }),
      makeInstance({ id: "s2", date: "2026-10-13", status: "done", durationMin: 120, order: 1 }),
    ];

    const recap = weekRecap({ categories, instances, weekStartISO: WEEK_START });
    expect(recap.suggestion.key).toBe("week.suggestion.keepRhythm");
  });

  it("invites a plan when the week is empty", () => {
    const recap = weekRecap({ categories, instances: [], weekStartISO: WEEK_START });
    expect(recap.suggestion.key).toBe("week.suggestion.planLess");
  });
});
