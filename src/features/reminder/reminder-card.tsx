"use client";

import { Button } from "@/components/ui/button";
import { IconClose, IconPlay, IconShuffle, IconSkip } from "@/components/ui/icons";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The reminder itself: what is due, when, and three ways to answer.
 *
 * One component for both homes — the corner card inside the app and the
 * separate always-on-top window on the desktop — so the two can never word the
 * same moment differently. Reschedule only appears once the start has passed:
 * at the start minute the honest choices are "start" or "not today".
 */
export function ReminderCard({
  title,
  start,
  end,
  lateMinutes,
  more,
  onStart,
  onSkip,
  onReschedule,
  onDismiss,
  className,
}: {
  title: string;
  /** Minutes of the day. */
  start: number;
  end: number;
  /** 0 at the start minute; above it, the block is late. */
  lateMinutes: number;
  /** Other blocks waiting behind this one. */
  more: number;
  onStart: () => void;
  onSkip: () => void;
  onReschedule: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  const { t, formatClockValue } = useI18n();
  const late = lateMinutes > 0;

  return (
    <section
      role="alertdialog"
      aria-label={t("reminder.label")}
      aria-live="assertive"
      className={cn("surface-floating flex flex-col gap-3 p-4", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2">
            {/* Late is a status, so it takes the status colour rather than the
                highlighter that marks "now" everywhere else. */}
            {late ? (
              <span className="rounded-[4px] bg-warn-surface px-1.5 py-px text-label font-semibold text-warn">
                {t("reminder.late", { minutes: lateMinutes })}
              </span>
            ) : (
              <span className="stabilo">{t("reminder.now")}</span>
            )}
            <span className="text-label tabular-nums text-ink-muted">
              {t("today.blockTime", { start: formatClockValue(start), end: formatClockValue(end) })}
            </span>
          </p>
          <h2 className="truncate text-title" title={title}>
            {title}
          </h2>
          {more > 0 ? (
            <p className="text-caption text-ink-muted">{t("reminder.more", { count: more })}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("reminder.dismiss")}
          className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-ctl text-ink-muted hover:bg-accent-surface hover:text-ink"
        >
          <IconClose width={16} height={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="md" variant="primary" onClick={onStart}>
          <IconPlay />
          {t("reminder.start")}
        </Button>
        {late ? (
          <Button size="md" variant="secondary" onClick={onReschedule}>
            <IconShuffle />
            {t("reminder.reschedule")}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onSkip}>
          <IconSkip />
          {t("reminder.skip")}
        </Button>
      </div>
    </section>
  );
}
