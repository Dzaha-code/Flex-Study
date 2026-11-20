"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/data/store";
import { budgetSeconds } from "@/domain";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { holdAwakeLock, holdScreenAwake, playAlarm, vibrate } from "@/lib/alarm";
import {
  cancelSystemAlarms,
  needsSystemAlarm,
  notify,
  requestAttention,
  scheduleSystemAlarm,
} from "@/lib/desktop";
import { formatCountdown, hashOf, remainingSeconds } from "@/domain";
import { FocusComplete } from "./focus-complete";

/** A heads-up before the end, only for blocks long enough to need one. */
const WARNING_SECONDS = 5 * 60;
const WARNING_MIN_BUDGET = 15 * 60;
/**
 * Opening the app long after a block ran out should not greet anyone with a
 * chime for something that ended last night. The screen still says so.
 */
const STALE_AFTER_MS = 5 * 60_000;
/** A slow safety net beside the exact timeout, for sleep and throttling. */
const FALLBACK_TICK_MS = 5_000;

/** A stable positive 31-bit id for an OS notification, from any string. */
function notificationId(text: string): number {
  return (parseInt(hashOf(text), 36) % 2_000_000_000) + 1;
}

/** Epoch ms at which the running block reaches zero. */
function deadlineOf(instance: BlockInstance): number {
  const started = instance.startedAt ?? Date.now();
  return started + Math.max(0, budgetSeconds(instance) - instance.actualSeconds) * 1000;
}

/**
 * The focus alarm, mounted once in the app shell so it keeps watching on every
 * screen: a running block ends while someone reads the journal just as often as
 * while they stare at the timer.
 *
 * When the time is up it plays a chime, posts a system notification and, in the
 * desktop app, flashes the taskbar button until the window is looked at. Then
 * the full-screen card asks the one question that matters: done, or more time?
 *
 * Everything is keyed on the block id plus its deadline, so "+5 minutes" re-arms
 * the alarm for the new end instead of being treated as already announced.
 */
export function FocusAlarmHost() {
  const alarmOn = useAppStore((state) => state.settings.focusAlarm);
  const remindersOn = useAppStore((state) => state.settings.remindersEnabled);
  const running = useAppStore(
    (state) =>
      state.instances.find(
        (instance) => instance.status === "running" && instance.startedAt !== null,
      ) ?? null,
  );
  const completeBlock = useAppStore((state) => state.completeBlock);
  const extendBlock = useAppStore((state) => state.extendBlock);
  const { t, formatMinutes } = useI18n();

  const announced = useRef<Set<string>>(new Set());
  const [overlayKey, setOverlayKey] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const keepScreenOn = useAppStore((state) => state.settings.keepScreenOn);
  const runningId = running?.id ?? null;
  useEffect(() => {
    if (runningId === null) return;
    return holdAwakeLock();
  }, [runningId]);

  // Optional: the screen stays on while a block runs, so a phone on the desk
  // keeps showing the countdown instead of going dark after thirty seconds.
  useEffect(() => {
    if (runningId === null || !keepScreenOn) return;
    return holdScreenAwake();
  }, [runningId, keepScreenOn]);

  const deadline = running ? deadlineOf(running) : null;
  const key = running && deadline !== null ? `${running.id}:${deadline}` : null;

  useEffect(() => {
    if (!running || deadline === null || key === null || !alarmOn) return;
    if (!needsSystemAlarm()) return;
    const ids = [notificationId(key), notificationId(`${key}:warn`)];
    void scheduleSystemAlarm(
      ids[0],
      deadline,
      t("timer.finished"),
      t("alarm.finishedBody", { title: running.title, minutes: formatMinutes(running.durationMin) }),
    );
    if (budgetSeconds(running) >= WARNING_MIN_BUDGET) {
      void scheduleSystemAlarm(
        ids[1],
        deadline - WARNING_SECONDS * 1000,
        t("alarm.warningTitle"),
        t("alarm.warningBody", { title: running.title }),
      );
    }
    // Finished early, extended, or skipped: the old deadline must not ring.
    return () => void cancelSystemAlarms(ids);
  }, [running, deadline, key, alarmOn, t, formatMinutes]);

  // The time left in the window title: visible on the taskbar and in the tab
  // while working in another app. Restored the moment nothing is running.
  useEffect(() => {
    if (!running) return;
    const original = document.title;
    const update = () => {
      const left = remainingSeconds(running, Date.now());
      document.title = left > 0 ? `${formatCountdown(left)} · ${running.title}` : `✓ ${running.title}`;
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
      document.title = original;
    };
  }, [running]);

  useEffect(() => {
    if (!running || deadline === null || key === null) return;

    const budget = budgetSeconds(running);
    const warnAt = deadline - WARNING_SECONDS * 1000;
    const warnKey = `${key}:warn`;

    const check = () => {
      const now = Date.now();

      if (
        budget >= WARNING_MIN_BUDGET &&
        now >= warnAt &&
        now < deadline &&
        !announced.current.has(warnKey)
      ) {
        announced.current.add(warnKey);
        // On Android the OS already holds this notification.
        if (alarmOn && !needsSystemAlarm()) {
          void notify(t("alarm.warningTitle"), t("alarm.warningBody", { title: running.title }));
        }
      }

      if (now < deadline || announced.current.has(key)) return;
      announced.current.add(key);
      setOverlayKey(key);

      if (now - deadline > STALE_AFTER_MS) return;
      if (alarmOn) {
        playAlarm();
        vibrate([300, 150, 300, 150, 600]);
        void requestAttention();
      }
      if ((alarmOn || remindersOn) && !(alarmOn && needsSystemAlarm())) {
        void notify(
          t("timer.finished"),
          t("alarm.finishedBody", {
            title: running.title,
            minutes: formatMinutes(running.durationMin),
          }),
        );
      }
    };

    check();
    const delay = Math.max(0, deadline - Date.now());
    const exact = window.setTimeout(check, Math.min(delay + 50, 2_147_000_000));
    const warnDelay = warnAt - Date.now();
    const early =
      warnDelay > 0 ? window.setTimeout(check, Math.min(warnDelay + 50, 2_147_000_000)) : null;
    const fallback = window.setInterval(check, FALLBACK_TICK_MS);
    // A laptop that slept through the deadline wakes into a visible page.
    document.addEventListener("visibilitychange", check);

    return () => {
      window.clearTimeout(exact);
      if (early !== null) window.clearTimeout(early);
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", check);
    };
  }, [running, deadline, key, alarmOn, remindersOn, t, formatMinutes]);

  if (!running || key === null || overlayKey !== key || dismissedKey === key) return null;

  return (
    <FocusComplete
      instance={running}
      onDismiss={() => setDismissedKey(key)}
      onFinish={() => {
        setDismissedKey(key);
        void completeBlock(running.id);
      }}
      onExtend={(minutes) => {
        setDismissedKey(key);
        void extendBlock(running.id, minutes);
      }}
    />
  );
}
