"use client";

import { memo } from "react";
import { ProgressBar } from "@/components/ui/surface";
import { formatCountdown, progressRatio, remainingSeconds } from "@/domain";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { useNow } from "@/lib/use-now";

/**
 * The one-second clock lives in this file and nowhere else (ToApk.md §7 D1.2).
 *
 * Every value below is derived from the instance's `startedAt`, never counted up
 * per tick, so a window that slept still shows the truth. Each ticking piece is a
 * memoised leaf that owns its own clock, which keeps a running timer from
 * re-rendering the day header, the streak strip or the rest of the timeline.
 */

/**
 * The time in a compact row: a live countdown while running, a frozen one
 * while paused, otherwise the plan. A paused block's seconds are already
 * banked, so `remainingSeconds` reads the same number on every render — the
 * clock stays stopped without a special case.
 *
 * The completion notification that 0.5.8 watched from here now lives in
 * `FocusAlarmHost` (mounted once in the shell), so no per-day watcher is needed
 * and a block can still never be announced twice.
 */
export const Countdown = memo(function Countdown({ instance }: { instance: BlockInstance }) {
  const { formatMinutes } = useI18n();
  const running = instance.status === "running";
  const paused = instance.status === "paused";
  const nowEpoch = useNow(running, 1000);

  return (
    <span className="text-label text-ink-muted">
      {running || paused
        ? formatCountdown(remainingSeconds(instance, nowEpoch))
        : formatMinutes(instance.durationMin)}
    </span>
  );
});

/**
 * Screen readers get the countdown on a slow cadence — every thirty seconds —
 * never once per second (ToApk.md §7 D1.4). Its clock is deliberately separate
 * from the visible countdown so the fast one cannot leak into `aria-live`.
 */
function TimerAnnouncement({ instance }: { instance: BlockInstance }) {
  const { t } = useI18n();
  const nowEpoch = useNow(true, 30_000);

  return (
    <p aria-live="polite" className="sr-only">
      {t("timer.announce", {
        title: instance.title,
        time: formatCountdown(remainingSeconds(instance, nowEpoch)),
      })}
    </p>
  );
}

/** The ticking parts of the focus card: countdown, remaining label and rule. */
export const FocusTimer = memo(function FocusTimer({ instance }: { instance: BlockInstance }) {
  const { t, formatMinutes } = useI18n();
  const running = instance.status === "running";
  const paused = instance.status === "paused";
  const nowEpoch = useNow(running, 1000);

  const remaining = remainingSeconds(instance, nowEpoch);
  const overrunning = running && remaining === 0;
  const ratio = running || paused ? progressRatio(instance, nowEpoch) : 0;

  return (
    <>
      {/* The "time is up" screen and chime live in FocusAlarmHost, mounted
          once in the shell, so they also fire away from this screen. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-display font-semibold tabular-nums">
          {running || paused
            ? formatCountdown(remaining)
            : formatMinutes(instance.durationMin)}
        </span>
        <span className="text-meta text-ink-muted">
          {running
            ? overrunning
              ? t("today.overtime")
              : t("today.remaining", { time: formatCountdown(remaining) })
            : paused
              ? t("today.pausedRemaining", { time: formatCountdown(remaining) })
              : t("common.minutesValue", { count: instance.durationMin })}
        </span>
      </div>

      {/* Announced on the same slow cadence — a paused timer is worth knowing
          about, and it is exactly the moment someone looks away. */}
      {running || paused ? <TimerAnnouncement instance={instance} /> : null}

      <ProgressBar
        value={ratio}
        label={t("a11y.progress", { done: Math.round(ratio * 100), total: 100 })}
      />
    </>
  );
});
