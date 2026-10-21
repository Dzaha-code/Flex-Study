"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True for `durationMs` after `value` changes.
 *
 * This is what keeps Isi (and any other action-triggered motion) honest: the
 * animation plays on the *transition*, never on mount. A row that was already
 * done when the screen opened does not re-play its sweep — nothing happened
 * just then (§4: pemicu = an action; §12: gerak dekoratif tidak ada).
 */
export function useJustChanged<T>(value: T, durationMs = 600): boolean {
  const previous = useRef(value);
  const [just, setJust] = useState(false);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setJust(true);
    const timer = window.setTimeout(() => setJust(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [value, durationMs]);

  return just;
}
