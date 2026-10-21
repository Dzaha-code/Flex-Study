/**
 * Isi — DESIGN.md v3 §4 primitive 5.
 *
 * Fills answer an action and then STOP on a value; there is no wave that keeps
 * moving (§0 rule 3). The visible Phase-1 fills are CSS animations
 * (`ink-fill-dot`, `ink-sweep` in globals.css) — they honour the global
 * reduced-motion clamp for free. These helpers are the pure maths the tube
 * (Phase 3) and any JS-driven sweep will share, so the clamp lives in one
 * tested place.
 */

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** `scaleX` frame for a 0…1 sweep anchored at its left edge. */
export function sweepScaleX(progress: number): string {
  return `scaleX(${clamp01(progress)})`;
}

/** The resting width for a fill at `progress` of its container. */
export function fillWidth(progress: number): string {
  return `${(clamp01(progress) * 100).toFixed(2)}%`;
}
