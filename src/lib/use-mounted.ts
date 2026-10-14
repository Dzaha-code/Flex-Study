"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

/**
 * `false` during the prerender pass and on the first client render, `true`
 * afterwards. Anything that depends on IndexedDB, `Date` or `matchMedia` must
 * sit behind this so the static shell never disagrees with the first paint.
 *
 * Implemented with `useSyncExternalStore` rather than a mount effect: React
 * compares the server snapshot (`false`) with the client snapshot (`true`) after
 * hydration and re-renders, so no state is set from inside an effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
