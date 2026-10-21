/**
 * Ink — DESIGN.md v3 §4 "bahasa gerak Tinta".
 *
 * Phase 1 ships three of the eight primitives:
 *   Riak (ripple)  — press feedback, pure geometry + pointerdown glue
 *   Isi (fill)     — sweeps that stop on a value (CSS + pure maths)
 *   Lebur (merge)  — two-phase indicator, pure schedule + WAAPI glue
 *
 * Rules that live here rather than in each caller:
 *   - WAAPI is not covered by the global reduced-motion clamp, so every
 *     scripted animation asks `motionReducedNow()` first and jumps instead.
 *   - CSS animations need no guard at all — the clamp in globals.css reaches
 *     them — so anything class-triggered stays in CSS.
 *   - Nothing loops. Every primitive finishes and is removed or parked.
 */

export { rippleGeometry, rippleFromPointer, type RippleGeometry } from "./ripple";
export { clamp01, sweepScaleX, fillWidth } from "./fill";
export {
  MERGE_BACK_DELAY_MS,
  MERGE_BACK_MS,
  MERGE_EASE,
  MERGE_FRONT_MS,
  commitMerge,
  mergeSteps,
  playMerge,
  type MergeRect,
  type MergeStep,
} from "./merge";
export { useJustChanged } from "./use-just-changed";
