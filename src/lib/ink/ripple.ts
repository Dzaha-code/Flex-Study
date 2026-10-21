/**
 * Riak — DESIGN.md v3 §4 primitive 4.
 *
 * Feedback, not decoration: a circle of ink wash (or lime on the primary
 * button) grows from the touch point and is gone. The geometry is pure so the
 * "reaches the farthest corner" rule is testable without a browser; the DOM
 * part is glue.
 *
 * Reduced motion (§12): no ripple is created at all — a 0.001ms ghost still
 * costs a layout pass, and the spec says *tanpa riak*, not *riak cepat*.
 */

import { motionReducedNow } from "../motion";

export interface RippleGeometry {
  /** Diameter of the finished circle: twice the distance to the farthest corner. */
  size: number;
  /** Position inside the host's padding box. */
  left: number;
  top: number;
}

/** The circle must cover the whole host at scale(1), whatever the touch point. */
export function rippleGeometry(
  host: { width: number; height: number },
  x: number,
  y: number,
): RippleGeometry {
  const dx = Math.max(x, host.width - x);
  const dy = Math.max(y, host.height - y);
  const size = 2 * Math.hypot(dx, dy);
  return { size, left: x - size / 2, top: y - size / 2 };
}

/**
 * Spread on a button's `onPointerDown`. `data-ink-ripple="off"` opts a control
 * out (the focus card's start button has its own lime spread, §6 — one answer
 * per press, never two).
 */
export function rippleFromPointer(event: {
  currentTarget: EventTarget & HTMLElement;
  clientX: number;
  clientY: number;
}): void {
  const host = event.currentTarget;
  if (!host || typeof document === "undefined") return;
  if (host.getAttribute("data-ink-ripple") === "off") return;
  if (motionReducedNow()) return;

  const rect = host.getBoundingClientRect();
  const { size, left, top } = rippleGeometry(
    { width: rect.width, height: rect.height },
    event.clientX - rect.left - host.clientLeft,
    event.clientY - rect.top - host.clientTop,
  );

  const dot = document.createElement("span");
  dot.className = "ink-ripple";
  dot.setAttribute("aria-hidden", "true");
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.left = `${left}px`;
  dot.style.top = `${top}px`;
  host.appendChild(dot);

  const release = () => dot.remove();
  dot.addEventListener("animationend", release, { once: true });
  // Safety net: a tab hidden mid-ripple never fires animationend (§11 — no
  // animation survives a hidden tab, and no orphan spans either).
  window.setTimeout(release, 800);
}
