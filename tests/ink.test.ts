import { describe, expect, it } from "vitest";
import {
  MERGE_BACK_DELAY_MS,
  MERGE_BACK_MS,
  MERGE_FRONT_MS,
  clamp01,
  fillWidth,
  mergeSteps,
  rippleGeometry,
  sweepScaleX,
} from "@/lib/ink";

/**
 * DESIGN.md v3 §4 — the ink primitives' pure cores. The DOM glue around them
 * (playMerge/rippleFromPointer) needs a browser and is verified manually; the
 * schedules and geometry that decide *what* the browser is told are here.
 */
describe("mergeSteps (Lebur)", () => {
  const CONTAINER = 300;

  it("keeps the documented timeline", () => {
    expect(MERGE_FRONT_MS).toBe(160);
    expect(MERGE_BACK_DELAY_MS).toBe(60);
    expect(MERGE_BACK_MS).toBe(220);
    // The trailing edge arrives 280 ms in — well under the 600 ms ceiling.
    expect(MERGE_BACK_DELAY_MS + MERGE_BACK_MS).toBeLessThanOrEqual(600);
  });

  it("treats a still rectangle as no motion at all", () => {
    expect(mergeSteps({ left: 10, width: 50 }, { left: 10, width: 50 }, CONTAINER)).toEqual([]);
    // Sub-half-pixel jitter (a re-measure with identical layout) is not motion.
    expect(mergeSteps({ left: 10, width: 50 }, { left: 10.3, width: 50.2 }, CONTAINER)).toEqual([]);
  });

  it("travelling right: the right edge leads, the left edge follows late", () => {
    const from = { left: 10, width: 50 };
    const to = { left: 100, width: 50 };
    const steps = mergeSteps(from, to, CONTAINER);

    expect(steps).toHaveLength(2);
    const front = steps.find((step) => step.property === "right");
    const back = steps.find((step) => step.property === "left");
    expect(front).toMatchObject({ delay: 0, duration: MERGE_FRONT_MS });
    expect(back).toMatchObject({ delay: MERGE_BACK_DELAY_MS, duration: MERGE_BACK_MS });

    // `right` is measured against the container's padding box.
    expect(front?.from).toBe(CONTAINER - 10 - 50);
    expect(front?.to).toBe(CONTAINER - 100 - 50);
    expect(back?.from).toBe(10);
    expect(back?.to).toBe(100);
  });

  it("travelling left: the roles mirror", () => {
    const from = { left: 100, width: 50 };
    const to = { left: 10, width: 50 };
    const steps = mergeSteps(from, to, CONTAINER);

    expect(steps).toHaveLength(2);
    const front = steps.find((step) => step.property === "left");
    const back = steps.find((step) => step.property === "right");
    expect(front).toMatchObject({ delay: 0, duration: MERGE_FRONT_MS });
    expect(back).toMatchObject({ delay: MERGE_BACK_DELAY_MS, duration: MERGE_BACK_MS });
    expect(front?.from).toBe(100);
    expect(front?.to).toBe(10);
    expect(back?.from).toBe(CONTAINER - 100 - 50);
    expect(back?.to).toBe(CONTAINER - 10 - 50);
  });

  it("a stretch to a wider option leads with the front edge", () => {
    // Same left, wider box travelling right: only the right edge can move.
    const steps = mergeSteps({ left: 10, width: 50 }, { left: 10, width: 90 }, CONTAINER);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ property: "right", delay: 0, duration: MERGE_FRONT_MS });
  });

  it("a contraction whose only motion is the trailing edge is promoted to front timing", () => {
    // Centre travels left while `left` stays put — the right edge is the real
    // motion, and it must not wait out the 60 ms coordination delay.
    const steps = mergeSteps({ left: 10, width: 90 }, { left: 10, width: 50 }, CONTAINER);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ property: "right", delay: 0, duration: MERGE_FRONT_MS });
    expect(steps[0].from).toBe(CONTAINER - 10 - 90);
    expect(steps[0].to).toBe(CONTAINER - 10 - 50);
  });

  it("a pure translation stretches: both edges move, offset in time", () => {
    const [front, back] = mergeSteps({ left: 0, width: 40 }, { left: 200, width: 40 }, CONTAINER);
    // The front edge is the `right` property, which *shrinks* as the box
    // travels right (it is measured from the container's right edge) — what
    // matters is that it travels the full distance on its own, ahead of the
    // back edge, so the box stretches between the two arrivals (§6.2).
    expect(Math.abs(front.to - front.from)).toBe(200);
    expect(front.property).toBe("right");
    expect(back.delay).toBeGreaterThan(0);
    const frontArrivesAt = front.delay + front.duration;
    const backArrivesAt = back.delay + back.duration;
    expect(frontArrivesAt).toBeLessThan(backArrivesAt);
  });
});

describe("rippleGeometry (Riak)", () => {
  const host = { width: 120, height: 44 };

  it("centres the circle on the touch point", () => {
    const geometry = rippleGeometry(host, 60, 22);
    expect(geometry.left + geometry.size / 2).toBeCloseTo(60);
    expect(geometry.top + geometry.size / 2).toBeCloseTo(22);
  });

  it("grows the circle to reach the farthest corner from any touch point", () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [120, 44],
      [120, 0],
      [0, 44],
      [1, 22],
      [60, 22],
    ];
    for (const [x, y] of points) {
      const geometry = rippleGeometry(host, x, y);
      const dx = Math.max(x, host.width - x);
      const dy = Math.max(y, host.height - y);
      expect(geometry.size).toBeCloseTo(2 * Math.hypot(dx, dy));
      expect(geometry.size).toBeGreaterThan(0);
    }
  });
});

describe("fill helpers (Isi)", () => {
  it("clamps progress into 0…1 and survives bad input", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(9)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("renders sweeps and widths from the clamped value", () => {
    expect(sweepScaleX(0.42)).toBe("scaleX(0.42)");
    expect(sweepScaleX(-1)).toBe("scaleX(0)");
    expect(sweepScaleX(2)).toBe("scaleX(1)");
    expect(fillWidth(0.5)).toBe("50.00%");
    expect(fillWidth(1.5)).toBe("100.00%");
    expect(fillWidth(-0.5)).toBe("0.00%");
  });
});
