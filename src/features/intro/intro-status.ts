"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the opening animation is holding the app behind it.
 *
 * The order on a first launch is language → intro → Stabilo → template, and
 * Stabilo must not start talking behind the intro. `IntroGate` publishes here so
 * anything outside it can wait without reading the DOM.
 */
let holding = false;

const listeners = new Set<() => void>();

export function setIntroHolding(next: boolean): void {
  if (holding === next) return;
  holding = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIntroHolding(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => holding,
    () => false,
  );
}
