"use client";

import { useSyncExternalStore } from "react";

/**
 * Which block the reschedule sheet is open for, if any.
 *
 * Transient UI, so it lives outside the persisted store — the same shape as the
 * tour's store. Three places open it (a block's card, the in-app reminder and
 * the desktop reminder window), and none of them should have to thread a
 * callback through the screens in between.
 */
let target: string | null = null;
const listeners = new Set<() => void>();

function publish(next: string | null) {
  target = next;
  for (const listener of listeners) listener();
}

export function openReschedule(instanceId: string) {
  publish(instanceId);
}

export function closeReschedule() {
  publish(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRescheduleTarget(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => target,
    () => null,
  );
}
