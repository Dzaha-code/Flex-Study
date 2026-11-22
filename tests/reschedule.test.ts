import { describe, expect, it } from "vitest";
import { createSequentialIdFactory } from "@/domain/ids";
import {
  canReschedule,
  dueFixedBlocks,
  fixedTiming,
  minutesLate,
  nextFreeSlot,
  planReschedule,
  rescheduleOptions,
} from "@/domain/reschedule";
import { applyShift, undoShift } from "@/domain/shift";
import { parseClock } from "@/domain/time";
import type { BlockInstance } from "@/domain/types";
import { atLocal, bounds, makeInstance } from "./helpers";

const DAY = "2026-10-14";
const NEXT = "2026-10-15";
const at = (clock: string) => parseClock(clock);

const fixed = (overrides: Partial<BlockInstance> = {}) =>
  makeInstance({ id: "f1", date: DAY, plannedStart: "19:00", durationMin: 45, ...overrides });

describe("fixedTiming", () => {
  it("walks from upcoming to now to late to missed", () => {
    const block = fixed();
    expect(fixedTiming(block, DAY, at("18:59"))).toBe("upcoming");
    expect(fixedTiming(block, DAY, at("19:00"))).toBe("now");
    expect(fixedTiming(block, DAY, at("19:10"))).toBe("late");
    expect(fixedTiming(block, DAY, at("19:44"))).toBe("late");
    expect(fixedTiming(block, DAY, at("19:45"))).toBe("missed");
  });

  it("treats other days by date alone", () => {
    expect(fixedTiming(fixed(), NEXT, 0)).toBe("missed");
    expect(fixedTiming(fixed(), "2026-10-13", at("23:59"))).toBe("upcoming");
  });

  it("ignores floating and already-settled blocks", () => {
    expect(fixedTiming(fixed({ plannedStart: null }), DAY, at("19:10"))).toBeNull();
    expect(fixedTiming(fixed({ status: "running" }), DAY, at("19:10"))).toBeNull();
    expect(fixedTiming(fixed({ status: "done" }), DAY, at("19:10"))).toBeNull();
    expect(fixedTiming(fixed({ status: "skipped" }), DAY, at("19:10"))).toBeNull();
  });

  it("only offers reschedule once the start has passed", () => {
    expect(canReschedule(fixed(), DAY, at("19:00"))).toBe(false);
    expect(canReschedule(fixed(), DAY, at("19:01"))).toBe(true);
    expect(canReschedule(fixed(), DAY, at("20:00"))).toBe(true);
    expect(minutesLate(fixed(), DAY, at("19:12"))).toBe(12);
  });
});

describe("dueFixedBlocks", () => {
  it("lists today's fixed blocks that are due or late, earliest first", () => {
    const instances = [
      fixed({ id: "late", plannedStart: "18:30", durationMin: 60 }),
      fixed({ id: "now", plannedStart: "19:00" }),
      fixed({ id: "later", plannedStart: "20:00" }),
      fixed({ id: "over", plannedStart: "08:00", durationMin: 30 }),
      fixed({ id: "started", plannedStart: "18:45", status: "running" }),
      makeInstance({ id: "floating", date: DAY }),
      fixed({ id: "tomorrow", date: NEXT, plannedStart: "19:00" }),
    ];
    expect(dueFixedBlocks(instances, DAY, at("19:00")).map((block) => block.id)).toEqual([
      "late",
      "now",
    ]);
  });
});

describe("nextFreeSlot / rescheduleOptions", () => {
  it("finds the first gap after now, rounded to five minutes, skipping other work", () => {
    const block = fixed({ plannedStart: "09:00", durationMin: 30 });
    const instances = [
      block,
      makeInstance({ id: "busy", date: DAY, plannedStart: "10:15", durationMin: 60 }),
    ];
    // 10:12 rounds to 10:15, which is taken until 11:15.
    expect(nextFreeSlot(instances, block, DAY, at("10:12"), bounds)).toBe("11:15");
  });

  it("returns null when the day has no room left", () => {
    const block = fixed({ durationMin: 60 });
    expect(nextFreeSlot([block], block, DAY, at("21:00"), bounds)).toBeNull();
  });

  it("offers the next slot today and the same time tomorrow", () => {
    const block = fixed();
    const options = rescheduleOptions([block], block, DAY, at("19:10"), bounds);
    expect(options).toEqual([
      { kind: "nextSlot", date: DAY, start: "19:10" },
      { kind: "tomorrow", date: NEXT, start: "19:00" },
    ]);
  });
});

describe("planReschedule + applyShift", () => {
  const context = { now: atLocal(2026, 10, 14, 19, 10), newId: createSequentialIdFactory() };

  it("same day: keeps the row and changes only its start", () => {
    const block = fixed();
    const plan = planReschedule({ block, toDate: DAY, toStart: "20:30" });
    const result = applyShift(plan, [block], context);

    expect(result.upserts).toHaveLength(1);
    expect(result.upserts[0]).toMatchObject({ id: "f1", date: DAY, plannedStart: "20:30", status: "planned" });
    expect(result.event.moves).toHaveLength(1);
  });

  it("another day: defers this row and creates the block there at the chosen time", () => {
    const block = fixed();
    const plan = planReschedule({ block, toDate: NEXT, toStart: "07:30" });
    const result = applyShift(plan, [block], context);

    const original = result.upserts.find((row) => row.id === "f1");
    const created = result.upserts.find((row) => row.id !== "f1");
    expect(original).toMatchObject({ status: "deferred", movedTo: NEXT });
    expect(created).toMatchObject({ date: NEXT, plannedStart: "07:30", status: "planned", movedFrom: DAY });

    // Undo puts the original back and removes the copy.
    const undo = undoShift(result.event);
    expect(undo.upserts.find((row) => row.id === "f1")).toMatchObject({ status: "planned", plannedStart: "19:00" });
    expect(undo.deletes).toEqual([created?.id]);
  });
});
