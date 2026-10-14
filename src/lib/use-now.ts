"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A clock for timers and the "now" marker.
 *
 * Driven by `requestAnimationFrame`, and always a fresh `Date.now()` rather than
 * an accumulator — so a tab that slept for an hour reports the real elapsed
 * time the moment it wakes up. Updates are throttled to `intervalMs` to keep
 * re-renders cheap.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  const lastRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const tick = (timestamp: number) => {
      if (timestamp - lastRef.current >= intervalMs) {
        lastRef.current = timestamp;
        setNow(Date.now());
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, intervalMs]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return now;
}
