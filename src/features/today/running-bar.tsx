"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCheck, IconPlay } from "@/components/ui/icons";
import { useAppStore } from "@/data/store";
import { formatCountdown, progressRatio, remainingSeconds } from "@/domain";
import { useI18n } from "@/i18n";
import { vibrate } from "@/lib/alarm";
import { useNow } from "@/lib/use-now";

/**
 * The running block, carried to every other screen like a music player's mini
 * bar. Reading the journal or tweaking a template should not mean losing sight
 * of the timer, and finishing should be one tap from wherever you are.
 *
 * Hidden on Today, which already shows the full card. On a phone it sits just
 * above the bottom navigation; on a wide screen it floats bottom-right.
 */
export function RunningBar() {
  const pathname = usePathname();
  const running = useAppStore(
    (state) =>
      state.instances.find((instance) => instance.status === "running" && instance.startedAt !== null) ??
      null,
  );
  const completeBlock = useAppStore((state) => state.completeBlock);
  const { t } = useI18n();
  const now = useNow(running !== null, 1000);

  if (!running || pathname === "/") return null;

  const left = remainingSeconds(running, now);
  const ratio = progressRatio(running, now);

  return (
    <>
      {/* Keeps the last lines of the page from hiding under the bar on a phone. */}
      <div aria-hidden="true" className="h-16 lg:hidden" />
      <div
        role="region"
        aria-label={t("runningBar.label")}
        className="running-bar fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[22rem]"
      >
        <div className="surface-floating relative flex items-center gap-3 overflow-hidden py-2 pl-3 pr-2">
          {/* Progress as a ruled line along the top edge. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-0.5 origin-left bg-ink"
            style={{ transform: `scaleX(${ratio})` }}
          />
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 rounded-ctl">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hl text-hl-ink">
              <IconPlay size={14} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-meta font-medium">{running.title}</span>
              <span className="text-caption tabular-nums text-ink-muted">
                {left > 0 ? t("today.remaining", { time: formatCountdown(left) }) : t("today.overtime")}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => {
              vibrate(15);
              void completeBlock(running.id);
            }}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-ink px-3 text-meta font-medium text-bg"
          >
            <IconCheck size={16} />
            {t("common.finish")}
          </button>
        </div>
      </div>
    </>
  );
}
