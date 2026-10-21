"use client";

import { useSyncExternalStore } from "react";
import type { AnimationPreference } from "@/domain/types";

/**
 * One switch for the whole app's motion.
 *
 * `system` is the default and follows `prefers-reduced-motion` everywhere: the
 * global rule in `globals.css` drops every animation to nothing, `stabilo.css`
 * removes hers, and the intro takes its static branch. That is the right
 * default — but a machine reports `reduce` for reasons nobody chose (animation
 * effects off, a "best performance" power profile, Remote Desktop). Someone who
 * switched those off for speed did not ask for a still app.
 *
 * So the preference carries three values, and `<html data-motion="…">` is how
 * the stylesheets hear the answer: `full` overrides the OS, `reduced` applies it
 * even when the OS never asked, and `system` writes nothing at all.
 */

export const MOTION_ATTRIBUTE = "data-motion";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * The single judgement both the CSS attribute and the JS-driven motion agree on.
 *
 * Kept pure and separate from the DOM so the three-way decision can be tested:
 * an explicit choice always outranks the media query, and only `system` ever
 * reads it.
 */
export function resolveReducedMotion(
  animation: AnimationPreference,
  systemReduces: boolean,
): boolean {
  if (animation === "reduced") return true;
  if (animation === "full") return false;
  return systemReduces;
}

export function applyMotionAttribute(animation: AnimationPreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // `system` removes the attribute rather than setting a third value, so the
  // media query is the only thing in charge — exactly as before this existed.
  if (animation === "system") root.removeAttribute(MOTION_ATTRIBUTE);
  else {
    root.setAttribute(MOTION_ATTRIBUTE, animation === "full" ? "full" : "reduced");
  }
}

export function subscribeReducedMotion(listener: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/**
 * The answer JS-driven motion reads — the same three-way decision as the CSS
 * attribute, resolved at this instant.
 *
 * The global `!important` clamp in globals.css only reaches CSS animations and
 * transitions; WAAPI ignores it entirely. So every scripted animation (the
 * ink primitives) must ask this first and jump to the end state rather than
 * play a 0.001ms ghost.
 */
export function motionReducedNow(): boolean {
  if (typeof document === "undefined") return false;
  const attr = document.documentElement.getAttribute(MOTION_ATTRIBUTE);
  if (attr === "reduced") return true;
  if (attr === "full") return false;
  return systemPrefersReducedMotion();
}

/** `false` on the server: a boolean cannot mismatch hydration meaningfully. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, systemPrefersReducedMotion, () => false);
}
