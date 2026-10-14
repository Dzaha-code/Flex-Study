import { describe, expect, it } from "vitest";
import { focusBlock, layoutDay, nextFreeStart } from "@/domain/schedule";
import { atLocal, bounds, makeInstance } from "./helpers";

const DAY = "2026-10-14";
const DAY_START = 8 * 60;

describe("layoutDay", () => {
  it("flows blocks without a start time from the day start", () => {
    const blocks = [
      makeInstance({ id: "a", date: DAY, order: 0, durationMin: 90 }),
      makeInstance({ id: "b", date: DAY, order: 1, durationMin: 45 }),
    ];

    const laid = layoutDay(blocks, { dayStartMinute: DAY_START });

    expect(laid.map((block) => block.startMinute)).toEqual([480, 570]);
    expect(laid.map((block) => block.endMinute)).toEqual([570, 615]);
    expect(laid.every((block) => !block.fixed)).toBe(true);
  });

  it("keeps a fixed start and makes floating blocks skip past it", () => {
    const blocks = [
      makeInstance({ id: "float", date: DAY, order: 0, durationMin: 60 }),
      makeInstance({ id: "fixed", date: DAY, order: 1, durationMin: 60, plannedStart: "08:30" }),
    ];

    const laid = layoutDay(blocks, { dayStartMinute: DAY_START });
    const byId = new Map(laid.map((block) => [block.instance.id, block]));

    expect(byId.get("fixed")?.startMinute).toBe(510);
    expect(byId.get("fixed")?.fixed).toBe(true);
    // 08:00 + 60 would end at 09:00 and collide, so it starts after the fixed block.
    expect(byId.get("float")?.startMinute).toBe(570);
  });

  it("skips a fixed block that starts inside a floating block's span", () => {
    const blocks = [
      makeInstance({ id: "long", date: DAY, order: 0, durationMin: 120 }),
      makeInstance({ id: "fixed", date: DAY, order: 1, durationMin: 30, plannedStart: "09:00" }),
    ];

    const laid = layoutDay(blocks, { dayStartMinute: DAY_START });
    const long = laid.find((block) => block.instance.id === "long");

    expect(long?.startMinute).toBe(570);
    expect(long?.endMinute).toBe(690);
  });

  it("flags two pinned blocks that collide instead of hiding it", () => {
    const blocks = [
      makeInstance({ id: "one", date: DAY, plannedStart: "09:00", durationMin: 60 }),
      makeInstance({ id: "two", date: DAY, plannedStart: "09:30", durationMin: 60, order: 1 }),
    ];

    const laid = layoutDay(blocks, { dayStartMinute: DAY_START });
    const two = laid.find((block) => block.instance.id === "two");

    expect(two?.overlap).toBe(true);
    expect(laid.find((block) => block.instance.id === "one")?.overlap).toBe(false);
  });

  it("leaves deferred and skipped blocks out of the timeline", () => {
    const blocks = [
      makeInstance({ id: "gone", date: DAY, status: "deferred", durationMin: 90 }),
      makeInstance({ id: "dropped", date: DAY, status: "skipped", order: 1 }),
      makeInstance({ id: "live", date: DAY, order: 2, durationMin: 30 }),
    ];

    const laid = layoutDay(blocks, { dayStartMinute: DAY_START });

    expect(laid).toHaveLength(1);
    expect(laid[0].instance.id).toBe("live");
    expect(laid[0].startMinute).toBe(480);
  });

  it("orders the result by clock time", () => {
    const laid = layoutDay(
      [
        makeInstance({ id: "late", date: DAY, plannedStart: "15:00" }),
        makeInstance({ id: "early", date: DAY, plannedStart: "09:00", order: 1 }),
      ],
      { dayStartMinute: DAY_START },
    );

    expect(laid.map((block) => block.instance.id)).toEqual(["early", "late"]);
  });
});

describe("nextFreeStart", () => {
  it("returns the cursor when nothing is in the way", () => {
    expect(nextFreeStart(600, 60, [])).toBe(600);
  });

  it("jumps past an interval that covers the cursor", () => {
    expect(nextFreeStart(600, 60, [{ start: 570, end: 660 }])).toBe(660);
  });

  it("jumps past an interval starting inside the span", () => {
    expect(nextFreeStart(600, 120, [{ start: 660, end: 720 }])).toBe(720);
  });

  it("resolves a chain of collisions", () => {
    expect(
      nextFreeStart(600, 60, [
        { start: 600, end: 630 },
        { start: 630, end: 700 },
      ]),
    ).toBe(700);
  });
});

describe("focusBlock", () => {
  const blocks = layoutDay(
    [
      makeInstance({ id: "done", date: DAY, status: "done", durationMin: 60, order: 0 }),
      makeInstance({ id: "later", date: DAY, durationMin: 60, order: 1 }),
    ],
    { dayStartMinute: DAY_START },
  );

  it("prefers whatever is running", () => {
    const withRunning = layoutDay(
      [
        makeInstance({ id: "done", date: DAY, status: "done", durationMin: 60, order: 0 }),
        makeInstance({ id: "run", date: DAY, status: "running", durationMin: 60, order: 1 }),
        makeInstance({ id: "later", date: DAY, durationMin: 60, order: 2 }),
      ],
      { dayStartMinute: DAY_START },
    );

    expect(focusBlock(withRunning, 500)?.instance.id).toBe("run");
  });

  it("falls back to the upcoming block", () => {
    expect(focusBlock(blocks, 500)?.instance.id).toBe("later");
  });

  it("returns null for an empty day", () => {
    expect(focusBlock([], 500)).toBeNull();
  });
});

describe("helpers", () => {
  it("builds a local instant for tests", () => {
    const epoch = atLocal(2026, 10, 14, 10, 12);
    const date = new Date(epoch);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(12);
  });

  it("exposes default day bounds", () => {
    expect(bounds.dayStart).toBe("08:00");
    expect(bounds.dayEnd).toBe("21:30");
  });
});
