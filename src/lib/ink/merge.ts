/**
 * Lebur — DESIGN.md v3 §4 primitive 6, §6.2.
 *
 * The indicator does not slide as one rigid box: its leading edge arrives first
 * (160 ms) and the trailing edge follows 60 ms later over 220 ms, so the shape
 * stretches toward the target and catches up — liquid without a gooey filter.
 *
 * Implementation: each EDGE animates independently (`left` for the trailing
 * side when travelling right, `right` for the leading side, and the mirror when
 * travelling left). Animating `left`/`right` instead of `transform` is the one
 * small absolutely-positioned element the motion rules allow to touch layout
 * properties (§4: "kecuali satu elemen kecil bila tak terhindarkan") — it
 * reflows nothing but itself.
 *
 * The schedule is pure (unit-tested); `playMerge` is the DOM glue, and because
 * WAAPI is NOT covered by the global reduced-motion clamp it must ask
 * `motionReducedNow()` first and jump instead of playing fast.
 */

import { motionReducedNow } from "../motion";

export const MERGE_FRONT_MS = 160;
export const MERGE_BACK_DELAY_MS = 60;
export const MERGE_BACK_MS = 220;
/** Must stay in step with `--ease-out` in globals.css. */
export const MERGE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export interface MergeRect {
  left: number;
  width: number;
}

export interface MergeStep {
  property: "left" | "right";
  from: number;
  to: number;
  /** 0 for the leading edge, MERGE_BACK_DELAY_MS for the trailing one. */
  delay: number;
  duration: number;
}

/**
 * The two-phase schedule, as edges.
 *
 * `containerWidth` is the positioning box's padding-box width, because CSS
 * resolves `right` against it: right = width − left − boxWidth.
 *
 * Direction comes from the centre's travel; edges that do not move are dropped
 * (a pure resize animates only its moving edge, at the front timing).
 */
export function mergeSteps(
  from: MergeRect,
  to: MergeRect,
  containerWidth: number,
): MergeStep[] {
  const moved =
    Math.abs(from.left - to.left) > 0.5 || Math.abs(from.width - to.width) > 0.5;
  if (!moved) return [];

  const fromRight = containerWidth - from.left - from.width;
  const toRight = containerWidth - to.left - to.width;

  const leadingIsRight =
    to.left + to.width / 2 >= from.left + from.width / 2;

  const front: MergeStep = leadingIsRight
    ? { property: "right", from: fromRight, to: toRight, delay: 0, duration: MERGE_FRONT_MS }
    : { property: "left", from: from.left, to: to.left, delay: 0, duration: MERGE_FRONT_MS };
  const back: MergeStep = leadingIsRight
    ? { property: "left", from: from.left, to: to.left, delay: MERGE_BACK_DELAY_MS, duration: MERGE_BACK_MS }
    : { property: "right", from: fromRight, to: toRight, delay: MERGE_BACK_DELAY_MS, duration: MERGE_BACK_MS };

  const frontMoves = Math.abs(front.from - front.to) > 0.5;
  const backMoves = Math.abs(back.from - back.to) > 0.5;
  if (frontMoves && backMoves) return [front, back];
  if (frontMoves) return [front];
  if (!backMoves) return [];
  // The leading edge is the stationary one (a resize that contracts toward the
  // direction of travel): the only edge that moves must not sit through the
  // coordination delay, so it runs on front timing.
  return [{ ...back, delay: 0, duration: MERGE_FRONT_MS }];
}

/** The final resting style, also used when motion must be skipped. */
export function commitMerge(el: HTMLElement, rect: MergeRect): void {
  el.style.left = `${rect.left}px`;
  el.style.width = `${rect.width}px`;
  el.style.right = "";
}

/** In-flight runs per element, so a rapid second move supersedes the first. */
const running = new WeakMap<HTMLElement, Animation[]>();

export function playMerge(
  el: HTMLElement,
  from: MergeRect,
  to: MergeRect,
  containerWidth: number,
): void {
  // A superseded run must not fight the new one over the same edge, and must
  // not commit its stale destination: cancel makes its `finished` reject, and
  // the identity check below skips the commit either way.
  running.get(el)?.forEach((animation) => animation.cancel());
  running.delete(el);

  const steps = mergeSteps(from, to, containerWidth);
  if (steps.length === 0 || motionReducedNow() || typeof el.animate !== "function") {
    commitMerge(el, to);
    return;
  }

  // Edges address `left` AND `right`; width must stop being explicit or the
  // box becomes over-constrained and CSS silently drops one of them.
  el.style.left = `${from.left}px`;
  el.style.right = `${containerWidth - from.left - from.width}px`;
  el.style.width = "auto";

  const animations = steps.map((step) =>
    el.animate(
      [
        { [step.property]: `${step.from}px` },
        { [step.property]: `${step.to}px` },
      ],
      {
        duration: step.duration,
        delay: step.delay,
        easing: MERGE_EASE,
        fill: "both",
      },
    ),
  );
  running.set(el, animations);

  void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
    () => {
      if (running.get(el) !== animations) return; // superseded mid-flight
      animations.forEach((animation) => animation.cancel());
      running.delete(el);
      commitMerge(el, to);
    },
  );
}
