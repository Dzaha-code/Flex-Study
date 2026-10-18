"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

/**
 * A live clock for the dashboard header.
 *
 * It is deliberately not wired into the store: the time is not application
 * state, and re-rendering the screen every second for a label would undo the
 * "a one-second clock lives only in the timer" rule. This component owns its
 * own tick, stops while the window is hidden, and renders nothing during SSR so
 * there is no hydration mismatch.
 */
export function HeaderClock() {
  const { t } = useI18n();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(() => {
      if (!document.hidden) tick();
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return null;

  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return (
    <div
      role="timer"
      aria-label={`${t("today.clock")}: ${hours}:${minutes}`}
      className="hidden items-center gap-2.5 rounded-control border border-line-strong bg-surface-raised px-3 py-2 sm:flex"
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
      <span className="text-title font-medium leading-none tabular-nums">
        {hours}:{minutes}
        <span className="ml-1 align-baseline text-caption font-normal text-ink-muted">
          {seconds}
        </span>
      </span>
    </div>
  );
}
