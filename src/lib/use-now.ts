"use client";

import { useEffect, useState } from "react";

/**
 * A clock for timers and the "now" marker.
 *
 * Always reports a fresh `Date.now()` rather than counting ticks, so a window
 * that slept for an hour is correct the instant it wakes — the timer is derived
 * from timestamps, never from an accumulator.
 *
 * Ticks are scheduled with `setTimeout` rather than a `requestAnimationFrame`
 * loop: a frame callback would run roughly sixty times a second just to compare
 * two numbers, which is exactly the idle CPU cost ToApk.md §7 D1.5 rules out. A
 * hidden window stops its clock completely and catches up in a single jump when
 * it is shown again (§7 D1.3).
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    let timer: number | null = null;

    const stop = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = window.setTimeout(() => {
        setNow(Date.now());
        start();
      }, intervalMs);
    };

    const sync = () => {
      if (document.hidden) {
        stop();
        return;
      }
      setNow(Date.now());
      start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [active, intervalMs]);

  return now;
}
