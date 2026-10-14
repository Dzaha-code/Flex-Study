import { describe, expect, it } from "vitest";
import { createSequentialIdFactory } from "@/domain/ids";
import { applyShift, planCounts, planShift, undoShift } from "@/domain/shift";
import type { ShiftPlan } from "@/domain/shift";
import type { BlockInstance } from "@/domain/types";
import { categoryProgressForWeek, creditedMinutes } from "@/domain/targets";
import { atLocal, bounds, makeCategory, makeInstance } from "./helpers";

const DAY = "2026-10-14";
const NEXT = "2026-10-15";
const NOW = atLocal(2026, 10, 14, 10, 12);

function plan(overrides: Partial<Parameters<typeof planShift>[0]> = {}) {
  return planShift({
    strategy: "move_open_to_next_slot",
    date: DAY,
    instances: [],
    settings: bounds,
    now: NOW,
    ...overrides,
  });
}

function merge(instances: BlockInstance[], application: { upserts: BlockInstance[]; deletes: string[] }) {
  const map = new Map(instances.map((instance) => [instance.id, instance]));
  for (const upsert of application.upserts) map.set(upsert.id, upsert);
  for (const id of application.deletes) map.delete(id);
  return [...map.values()];
}

describe("planShift / move_open_to_next_slot", () => {
  it("moves unfinished blocks to the next free slot after now", () => {
    const instances = [
      makeInstance({ id: "b1", date: DAY, order: 0 }),
      makeInstance({ id: "b2", date: DAY, order: 1 }),
      makeInstance({ id: "b3", date: DAY, order: 2 }),
    ];

    const result = plan({ instances });

    expect(result.moves).toHaveLength(3);
    expect(result.moves.map((move) => move.toStart)).toEqual(["10:15", "11:15", "12:15"]);
    expect(result.moves.every((move) => move.toDate === DAY)).toBe(true);
    expect(result.movedMinutes).toBe(180);
    expect(result.warnings).toEqual([]);
  });

  it("respects finished work instead of stacking on top of it", () => {
    const instances = [
      makeInstance({ id: "done", date: DAY, status: "done", plannedStart: "09:00" }),
      makeInstance({ id: "b1", date: DAY, order: 1 }),
      makeInstance({ id: "b2", date: DAY, order: 2 }),
    ];

    const result = plan({ instances });

    expect(result.moves.map((move) => move.instanceId)).toEqual(["b1", "b2"]);
    expect(result.moves.map((move) => move.toStart)).toEqual(["10:15", "11:15"]);
  });

  it("spills into the following days when today runs out of room", () => {
    const instances = Array.from({ length: 8 }, (_, index) =>
      makeInstance({ id: `b${index + 1}`, date: DAY, order: index, durationMin: 120 }),
    );

    const result = plan({ instances });

    const sameDay = result.moves.filter((move) => move.toDate === DAY);
    const later = result.moves.filter((move) => move.toDate === NEXT);

    expect(sameDay).toHaveLength(5);
    expect(later).toHaveLength(3);
    expect(later.every((move) => move.toStart === null)).toBe(true);
    expect(result.movedMinutes).toBe(960);
  });

  it("never touches a running block and says so", () => {
    const instances = [
      makeInstance({ id: "run", date: DAY, status: "running", startedAt: NOW - 60_000, order: 0 }),
      makeInstance({ id: "b1", date: DAY, order: 1 }),
    ];

    const result = plan({ instances });

    expect(result.moves.map((move) => move.instanceId)).toEqual(["b1"]);
    expect(result.warnings.map((warning) => warning.key)).toContain("shift.warning.runningKept");
  });

  it("reports when there is nothing to move", () => {
    const result = plan({
      instances: [makeInstance({ id: "done", date: DAY, status: "done" })],
    });

    expect(result.moves).toEqual([]);
    expect(result.warnings.map((warning) => warning.key)).toContain("shift.warning.nothingToMove");
  });

  it("can be limited to the blocks the user selected", () => {
    const instances = [
      makeInstance({ id: "b1", date: DAY, order: 0 }),
      makeInstance({ id: "b2", date: DAY, order: 1 }),
    ];

    const result = plan({ instances, blockIds: ["b2"] });

    expect(result.moves.map((move) => move.instanceId)).toEqual(["b2"]);
  });
});

describe("planShift / move_open_to_day", () => {
  it("moves everything to the chosen day", () => {
    const instances = [
      makeInstance({ id: "b1", date: DAY, order: 0 }),
      makeInstance({ id: "b2", date: DAY, order: 1 }),
    ];

    const result = plan({
      strategy: "move_open_to_day",
      instances,
      targetDate: "2026-10-17",
    });

    expect(result.moves).toHaveLength(2);
    expect(result.moves.every((move) => move.toDate === "2026-10-17")).toBe(true);
  });

  it("refuses a target day in the past", () => {
    const result = plan({
      strategy: "move_open_to_day",
      instances: [makeInstance({ id: "b1", date: DAY })],
      targetDate: "2026-10-10",
    });

    expect(result.moves).toEqual([]);
    expect(result.warnings.map((warning) => warning.key)).toContain("shift.warning.targetBeforeToday");
  });
});

describe("planShift / skip_rest", () => {
  it("drops the rest of the day but keeps measured time", () => {
    const instances = [
      makeInstance({ id: "b1", date: DAY, order: 0 }),
      makeInstance({ id: "b2", date: DAY, order: 1 }),
      makeInstance({ id: "run", date: DAY, status: "running", startedAt: NOW - 30_000, order: 2 }),
      makeInstance({ id: "done", date: DAY, status: "done", order: 3 }),
    ];

    const result = plan({ strategy: "skip_rest", instances });

    expect(result.moves.map((move) => move.instanceId)).toEqual(["b1", "b2"]);
    expect(result.moves.every((move) => move.action === "skipped")).toBe(true);
    expect(result.skippedMinutes).toBe(120);
    expect(result.warnings.map((warning) => warning.key)).toContain("shift.warning.runningKept");
  });
});

describe("planShift / swap", () => {
  it("exchanges the clock times of two blocks", () => {
    const instances = [
      makeInstance({ id: "a", date: DAY, plannedStart: "10:00", order: 0 }),
      makeInstance({ id: "b", date: DAY, plannedStart: "14:00", order: 1 }),
    ];

    const result = plan({ strategy: "swap", instances, blockIds: ["a"], swapWithId: "b" });

    expect(result.moves).toHaveLength(2);
    expect(result.moves.find((move) => move.instanceId === "a")?.toStart).toBe("14:00");
    expect(result.moves.find((move) => move.instanceId === "b")?.toStart).toBe("10:00");
  });

  it("asks for two blocks when one is missing", () => {
    const result = plan({
      strategy: "swap",
      instances: [makeInstance({ id: "a", date: DAY })],
      blockIds: ["a"],
    });

    expect(result.moves).toEqual([]);
    expect(result.warnings.map((warning) => warning.key)).toContain("shift.warning.pickTwo");
  });
});

describe("applyShift", () => {
  it("defers the originals and creates the moved rows", () => {
    const instances = Array.from({ length: 8 }, (_, index) =>
      makeInstance({ id: `b${index + 1}`, date: DAY, order: index, durationMin: 120 }),
    );

    const result = plan({ instances });
    const application = applyShift(result, instances, { now: NOW, newId: createSequentialIdFactory() });

    const originals = application.upserts.filter((instance) => instance.date === DAY);
    const deferred = originals.filter((instance) => instance.status === "deferred");
    const created = application.upserts.filter((instance) => instance.date === NEXT);

    expect(deferred).toHaveLength(3);
    expect(deferred.every((instance) => instance.movedTo === NEXT)).toBe(true);
    expect(created).toHaveLength(3);
    expect(created.every((instance) => instance.status === "planned")).toBe(true);
    expect(created.every((instance) => instance.movedFrom === DAY)).toBe(true);
    expect(created.map((instance) => instance.order)).toEqual([0, 1, 2]);
    expect(application.event.createdInstanceIds).toHaveLength(3);
    expect(application.event.restoreBefore).toHaveLength(8);
  });

  it("banks the seconds of a running block before it leaves", () => {
    const running = makeInstance({
      id: "run",
      date: DAY,
      status: "running",
      startedAt: NOW - 60_000,
      actualSeconds: 30,
    });

    const manual: ShiftPlan = {
      strategy: "move_open_to_day",
      date: DAY,
      reason: null,
      moves: [
        {
          instanceId: "run",
          title: "run",
          action: "moved",
          fromDate: DAY,
          toDate: NEXT,
          fromStart: null,
          toStart: null,
        },
      ],
      warnings: [],
      movedMinutes: 0,
      skippedMinutes: 0,
    };

    const application = applyShift(manual, [running], {
      now: NOW,
      newId: createSequentialIdFactory(),
    });

    const origin = application.upserts.find((instance) => instance.id === "run");
    const copy = application.upserts.find((instance) => instance.id !== "run");

    expect(origin?.status).toBe("deferred");
    expect(origin?.startedAt).toBeNull();
    expect(origin?.actualSeconds).toBe(90);
    expect(copy?.actualSeconds).toBe(0);
  });
});

describe("undoShift", () => {
  it("puts the previous rows back and removes what the shift created", () => {
    const instances = [
      makeInstance({ id: "b1", date: DAY, order: 0 }),
      makeInstance({ id: "b2", date: DAY, order: 1 }),
    ];

    const result = plan({ strategy: "move_open_to_day", instances, targetDate: "2026-10-17" });
    const application = applyShift(result, instances, {
      now: NOW,
      newId: createSequentialIdFactory(),
    });
    const undo = undoShift(application.event);

    expect(undo.deletes).toEqual(application.event.createdInstanceIds);
    expect(undo.upserts).toHaveLength(2);
    expect(undo.upserts.every((instance) => instance.status === "planned")).toBe(true);
    expect(undo.upserts.every((instance) => instance.date === DAY)).toBe(true);
    expect(undo.upserts.every((instance) => instance.plannedStart === null)).toBe(true);
  });
});

describe("weekly targets", () => {
  it("does not move when blocks are postponed", () => {
    const categories = [makeCategory({ id: "study", weeklyTargetMinutes: 900 })];
    const instances = [
      makeInstance({ id: "done", date: "2026-10-13", status: "done", durationMin: 90 }),
      makeInstance({ id: "b1", date: DAY, order: 1 }),
      makeInstance({ id: "b2", date: DAY, order: 2 }),
    ];

    const before = categoryProgressForWeek({
      categories,
      instances,
      weekStartISO: "2026-10-12",
    })[0];

    const result = plan({ strategy: "move_open_to_day", instances, targetDate: "2026-10-17" });
    const application = applyShift(result, instances, {
      now: NOW,
      newId: createSequentialIdFactory(),
    });
    const after = categoryProgressForWeek({
      categories,
      instances: merge(instances, application),
      weekStartISO: "2026-10-12",
    })[0];

    expect(before.doneMinutes).toBe(90);
    expect(after.doneMinutes).toBe(before.doneMinutes);
    expect(after.targetMinutes).toBe(before.targetMinutes);
    // The two blocks still expected to happen simply changed week-day.
    expect(after.plannedBlocks).toBe(before.plannedBlocks);
    expect(after.plannedBlocks).toBe(2);
  });

  it("credits measured seconds when they exist", () => {
    expect(creditedMinutes(makeInstance({ id: "a", date: DAY, status: "done", durationMin: 60, actualSeconds: 3900 }))).toBe(65);
    expect(creditedMinutes(makeInstance({ id: "b", date: DAY, status: "done", durationMin: 60 }))).toBe(60);
    expect(creditedMinutes(makeInstance({ id: "c", date: DAY, status: "deferred", durationMin: 60 }))).toBe(0);
  });
});

describe("planCounts", () => {
  it("summarises a plan for the preview header", () => {
    const instances = Array.from({ length: 8 }, (_, index) =>
      makeInstance({ id: `b${index + 1}`, date: DAY, order: index, durationMin: 120 }),
    );

    expect(planCounts(plan({ instances }))).toEqual({ moved: 8, skipped: 0, days: 1 });
  });
});
