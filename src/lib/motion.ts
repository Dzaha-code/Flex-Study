"use client";

import { useSyncExternalStore } from "react";

/**
 * One switch for the whole app's motion.
 *
 * The OS preference is the default everywhere: `globals.css` drops every
 * animation to nothing, `stabilo.css` removes hers, and the host swaps her
 * typewriter for instant text. That is the right default — but a machine can
 * report `reduce` without the user ever asking for it (animation effects off,
 * a "best performance" power profile, a Remote Desktop session). On that
 * machine the character simply stops moving, and nothing in the interface says
 * why.
 *
 * `data-motion="full"` on `<html>` is the explicit opt-in that overrides that
 * coincidence. It is never set by default and only ever set from Settings, so
 * the accessibility preference still wins for everyone who does not ask.
 */

export const MOTION_ATTRIBUTE = "data-motion";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Mirrors the preference onto the document, where the CSS guards can see it. */
export function applyMotionAttribute(force: boolean): void {
  if (typeof document === "undefined") return;
  if (force) document.documentElement.setAttribute(MOTION_ATTRIBUTE, "full");
  else document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
}

export function subscribeReducedMotion(listener: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** `false` on the server: the prerendered shell never claims to know. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, systemPrefersReducedMotion, () => false);
}
