"use client";

import { memo, useCallback, useState } from "react";
import { ProgressBar } from "@/components/ui/surface";
import { formatCountdown, progressRatio, remainingSeconds } from "@/domain";
import type { LaidOutBlock } from "@/domain/schedule";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { useNow } from "@/lib/use-now";
import { FocusComplete } from "./focus-complete";
import { useTimerCompletion } from "./use-reminders";

/**
 * The one-second clock lives in this file and nowhere else (ToApk.md §7 D1.2).
 *
 * Every value below is derived from the instance's `startedAt`, never counted up
 * per tick, so a window that slept still shows the truth. Each ticking piece is a
 * memoised leaf that owns its own clock, which keeps a running timer from
 * re-rendering the day header, the streak strip or the rest of the timeline.
 */

/**
 * Renders nothing. It exists so the "block finished" notification fires on the
 * right second; it is mounted once per day view, so the same block can never be
 * announced twice.
 */
export const TimerWatcher = memo(function TimerWatcher({
  enabled,
  running,
  blocks,
}: {
  enabled: boolean;
  running: boolean;
  blocks: LaidOutBlock[];
}) {
  // No running block means no clock at all — idle cost is zero, not one tick per
  // second that has nothing to update.
  const nowEpoch = useNow(running, 1000);
  useTimerCompletion(enabled, blocks, nowEpoch);
  return null;
});

/** The time in a compact row: a live countdown while running, otherwise the plan. */
export const Countdown = memo(function Countdown({ instance }: { instance: BlockInstance }) {
  const { formatMinutes } = useI18n();
  const running = instance.status === "running";
  const nowEpoch = useNow(running, 1000);

  return (
    <span className="text-label text-ink-muted">
      {running
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
  const nowEpoch = useNow(running, 1000);

  const remaining = remainingSeconds(instance, nowEpoch);
  const overrunning = running && remaining === 0;
  const ratio = running ? progressRatio(instance, nowEpoch) : 0;

  // Remembered per block, so the full-screen moment appears exactly once and a
  // dismissal is never undone by the next tick.
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const dismiss = useCallback(() => setDismissedId(instance.id), [instance.id]);

  return (
    <>
      {overrunning && dismissedId !== instance.id ? (
        <FocusComplete instance={instance} onDismiss={dismiss} />
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-display font-semibold tabular-nums">
          {running ? formatCountdown(remaining) : formatMinutes(instance.durationMin)}
        </span>
        <span className="text-meta text-ink-muted">
          {running
            ? overrunning
              ? t("today.overtime")
              : t("today.remaining", { time: formatCountdown(remaining) })
            : t("common.minutesValue", { count: instance.durationMin })}
        </span>
      </div>

      {running ? <TimerAnnouncement instance={instance} /> : null}

      <ProgressBar
        value={ratio}
        label={t("a11y.progress", { done: Math.round(ratio * 100), total: 100 })}
      />
    </>
  );
});
