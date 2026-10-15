"use client";

import { useSyncExternalStore } from "react";

/**
 * The guided tour is transient UI, so it deliberately does not live in the
 * persisted store. A tiny external store keeps it reachable from the shell, the
 * guide page and settings without threading a context through every screen.
 */
interface TourState {
  open: boolean;
  index: number;
}

let state: TourState = { open: false, index: 0 };

const listeners = new Set<() => void>();

function publish(next: TourState) {
  state = next;
  for (const listener of listeners) listener();
}

export function startTour() {
  publish({ open: true, index: 0 });
}

export function closeTour() {
  publish({ open: false, index: 0 });
}

export function goToStep(index: number) {
  publish({ open: true, index: Math.max(0, index) });
}

export function nextStep(total: number) {
  if (state.index >= total - 1) {
    closeTour();
    return;
  }
  publish({ open: true, index: state.index + 1 });
}

export function previousStep() {
  publish({ open: true, index: Math.max(0, state.index - 1) });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): TourState {
  return state;
}

/** Stable reference: a fresh object here would re-render forever. */
const SERVER_SNAPSHOT: TourState = { open: false, index: 0 };

function getServerSnapshot(): TourState {
  return SERVER_SNAPSHOT;
}

export function useTour(): TourState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
