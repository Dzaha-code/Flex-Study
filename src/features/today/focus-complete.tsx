"use client";

import { useEffect } from "react";
import { IconCheck } from "@/components/ui/icons";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";

/**
 * The full-screen moment when a focus block runs out of time.
 *
 * It paints itself as the inverse of the current theme — `--ink` paper with
 * `--bg` text — so in a light theme it is light type on near-black, and in a
 * dark theme the whole thing flips with it. No shadow, no blur, no looping
 * animation: the screen arrives once, says one thing and leaves.
 *
 * It takes over without being asked, so it also has to be effortless to leave:
 * Escape, a click anywhere, or the button. The block keeps running either way —
 * dismissing this is not a decision about the work, only about the screen.
 */
export function FocusComplete({
  instance,
  onDismiss,
}: {
  instance: BlockInstance;
  onDismiss: () => void;
}) {
  const { t, formatMinutes } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("timer.completeLabel")}
      onClick={onDismiss}
      className="focus-complete fixed inset-0 z-90 flex flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full border border-current">
        <IconCheck size={28} />
      </span>

      <p className="text-display font-semibold">{t("timer.completeTitle")}</p>

      <p className="measure text-body opacity-80">
        {t("timer.completeBody", {
          title: instance.title,
          minutes: formatMinutes(instance.durationMin),
        })}
      </p>

      <p className="measure text-meta opacity-60">{t("timer.completeHint")}</p>

      <button
        type="button"
        autoFocus
        onClick={onDismiss}
        className="mt-1 inline-flex h-11 items-center rounded-control border border-current px-5 text-meta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        {t("common.close")}
      </button>
    </div>
  );
}
