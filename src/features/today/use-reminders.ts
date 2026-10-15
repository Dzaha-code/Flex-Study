"use client";

import { useEffect, useRef } from "react";
import { remainingSeconds } from "@/domain";
import type { LaidOutBlock } from "@/domain/schedule";
import { useI18n } from "@/i18n";
import { notify } from "@/lib/desktop";

/**
 * Reminders are opt-in and deliberately modest: while the app is open, a
 * notification fires the moment a block is due. Background scheduling needs a
 * service worker, which is phase 3 in the brief together with the PWA work.
 *
 * Delivery goes through `@/lib/desktop` — the only module that knows which shell
 * we are running in. Reading `Notification.permission` directly would silently
 * disable reminders inside a WebView, where it never reports "granted".
 */
export function useDueReminders(
  enabled: boolean,
  blocks: LaidOutBlock[],
  nowMinute: number,
): void {
  const notified = useRef<Set<string>>(new Set());
  const { t, formatMinutes } = useI18n();

  useEffect(() => {
    if (!enabled) return;

    for (const block of blocks) {
      if (block.instance.status !== "planned") continue;
      if (block.startMinute !== nowMinute) continue;

      const key = `${block.instance.date}:${block.instance.id}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);

      void notify(
        t("app.name"),
        `${block.instance.title} · ${formatMinutes(block.instance.durationMin)}`,
      );
    }
  }, [enabled, blocks, nowMinute, t, formatMinutes]);
}

/**
 * Fires once when a running timer reaches zero (ToApk.md §5).
 *
 * The moment is derived from the instance's `startedAt`, never counted up per
 * tick, so a sleeping or hidden window still reports the right time instead of
 * drifting with the render cadence.
 */
export function useTimerCompletion(
  enabled: boolean,
  blocks: LaidOutBlock[],
  nowEpoch: number,
): void {
  const notified = useRef<Set<string>>(new Set());
  const { t } = useI18n();

  useEffect(() => {
    if (!enabled) return;

    for (const block of blocks) {
      if (block.instance.status !== "running") continue;
      if (remainingSeconds(block.instance, nowEpoch) > 0) continue;

      const key = `${block.instance.date}:${block.instance.id}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);

      void notify(t("timer.finished"), block.instance.title);
    }
  }, [enabled, blocks, nowEpoch, t]);
}
