"use client";

import { useSyncExternalStore } from "react";
import type { Flow } from "./script";

/**
 * Which Stabilo flow is on screen. Deliberately not in the persisted store: it
 * is transient UI, like the classic tour, and must be openable from Settings and
 * the guide without threading a context through every screen.
 */
interface StabiloHostState {
  flow: Flow | null;
  /** Reopening the same flow has to remount it, so a counter forces that. */
  nonce: number;
}

let state: StabiloHostState = { flow: null, nonce: 0 };

const listeners = new Set<() => void>();

function publish(next: StabiloHostState) {
  state = next;
  for (const listener of listeners) listener();
}

export function openStabilo(flow: Flow) {
  publish({ flow, nonce: state.nonce + 1 });
}

export function closeStabilo() {
  publish({ flow: null, nonce: state.nonce });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER_SNAPSHOT: StabiloHostState = { flow: null, nonce: 0 };

export function useStabiloHost(): StabiloHostState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_SNAPSHOT);
}
