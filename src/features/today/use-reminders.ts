"use client";

import { useEffect, useRef } from "react";
import type { LaidOutBlock } from "@/domain/schedule";
import { useI18n } from "@/i18n";

/**
 * Reminders are opt-in and deliberately modest: while the app is open, a browser
 * notification fires the moment a block is due. Background scheduling needs a
 * service worker, which is phase 3 in the brief together with the PWA work.
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
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    for (const block of blocks) {
      if (block.instance.status !== "planned") continue;
      if (block.startMinute !== nowMinute) continue;

      const key = `${block.instance.date}:${block.instance.id}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);

      try {
        new Notification(t("app.name"), {
          body: `${block.instance.title} · ${formatMinutes(block.instance.durationMin)}`,
          tag: key,
        });
      } catch {
        // Notifications can be blocked at any point; the app keeps working.
      }
    }
  }, [enabled, blocks, nowMinute, t, formatMinutes]);
}
