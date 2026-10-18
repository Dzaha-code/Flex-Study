"use client";

import { useSyncExternalStore } from "react";
import type { ContentWidth } from "@/domain/types";

/**
 * Whether the window is filling the screen, and what that means for the column.
 *
 * A maximised window should not keep a dead band on the right, and asking the
 * user to flip a width control every time they maximise is one manual step
 * too many. The web build cannot ask the OS "are you maximised" — no such
 * API — so this compares the viewport against the screen the window sits on.
 *
 * The tolerances are not laziness. The client area excludes the title bar
 * (~31 px) and the vertical scrollbar (~15 px), and fractional DPI scaling
 * rounds both, so an exact match never happens. Anything within these margins
 * is "the window fills the screen" as far as the layout is concerned.
 */
const WIDTH_SLACK = 24;
const HEIGHT_SLACK = 64;

export interface WindowMetrics {
  viewportWidth: number;
  viewportHeight: number;
  availWidth: number;
  availHeight: number;
}

export function fillsScreen(metrics: WindowMetrics): boolean {
  const { viewportWidth, viewportHeight, availWidth, availHeight } = metrics;
  if (availWidth <= 0 || availHeight <= 0) return false;
  return viewportWidth >= availWidth - WIDTH_SLACK && viewportHeight >= availHeight - HEIGHT_SLACK;
}

export function readWindowMetrics(): WindowMetrics | null {
  if (typeof window === "undefined" || !window.screen) return null;
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
  };
}

export function isWindowMaximised(): boolean {
  const metrics = readWindowMetrics();
  return metrics ? fillsScreen(metrics) : false;
}

/**
 * The stored preference is what a restored window uses. While the window is
 * maximised the column goes full, and nothing is written to the database —
 * resizing a window is not an edit to someone's settings.
 */
export function resolveContentWidth(
  preference: ContentWidth,
  maximised: boolean,
): ContentWidth {
  return maximised ? "full" : preference;
}

export function subscribeWindowSize(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}

export function useWindowMaximised(): boolean {
  return useSyncExternalStore(subscribeWindowSize, isWindowMaximised, () => false);
}
