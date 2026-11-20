"use client";

import { useEffect } from "react";
import { IconCheck } from "@/components/ui/icons";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";

const EXTEND_MINUTES = 5;

/**
 * The full-screen moment when a focus block runs out of time.
 *
 * It paints itself as the inverse of the current theme — `--ink` paper with
 * `--bg` text — so in a light theme it is light type on near-black, and in a
 * dark theme the whole thing flips with it. No shadow, no blur, no looping
 * animation: the screen arrives once, asks one question and leaves.
 *
 * The question is "finished, or more time?", answered right here, so knowing
 * whether the work is done never needs a trip back to the timeline. It takes
 * over without being asked, so it also has to be effortless to leave: Escape,
 * a click on the backdrop, or the close button. Closing keeps the block running
 * — dismissing this is a decision about the screen, not about the work.
 */
export function FocusComplete({
  instance,
  onDismiss,
  onFinish,
  onExtend,
}: {
  instance: BlockInstance;
  onDismiss: () => void;
  onFinish?: () => void;
  onExtend?: (minutes: number) => void;
}) {
  const { t, formatMinutes } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const buttonClass =
    "inline-flex h-11 items-center gap-2 rounded-control border border-current px-5 text-meta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("timer.completeLabel")}
      onClick={onDismiss}
      className="focus-complete fixed inset-0 z-90 flex flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <span className="focus-complete-bell flex size-14 items-center justify-center rounded-full border border-current">
        <IconCheck size={28} />
      </span>

      <p className="text-display font-semibold">{t("timer.completeTitle")}</p>

      <p className="measure text-body opacity-80">
        {t("timer.completeBody", {
          title: instance.title,
          minutes: formatMinutes(instance.durationMin),
        })}
      </p>

      <p className="measure text-meta opacity-60">{t("alarm.question")}</p>

      <div
        className="mt-1 flex flex-wrap items-center justify-center gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        {onFinish ? (
          <button
            type="button"
            autoFocus
            onClick={onFinish}
            className={`${buttonClass} bg-[var(--bg)] font-semibold text-[var(--ink)]`}
          >
            <IconCheck size={16} />
            {t("alarm.finish")}
          </button>
        ) : null}
        {onExtend ? (
          <button
            type="button"
            onClick={() => onExtend(EXTEND_MINUTES)}
            className={buttonClass}
          >
            {t("alarm.extend", { minutes: EXTEND_MINUTES })}
          </button>
        ) : null}
        <button
          type="button"
          autoFocus={!onFinish}
          onClick={onDismiss}
          className={buttonClass}
        >
          {t("alarm.keepGoing")}
        </button>
      </div>
    </div>
  );
}
