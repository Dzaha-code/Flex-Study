"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/data/store";
import { dueFixedBlocks, minuteOfDayFromEpoch, minutesLate, parseClock, todayISO } from "@/domain";
import type { BlockInstance } from "@/domain/types";
import { vibrate } from "@/lib/alarm";
import {
  closeReminderWindow,
  focusMainWindow,
  onReminderAction,
  showReminderWindow,
  supportsReminderWindow,
  type ReminderAction,
} from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { ReminderCard } from "./reminder-card";
import { openReschedule } from "./reschedule-store";

const DISMISSED_KEY = "fs.reminder.dismissed";

/**
 * A reminder is answered once per block *and start time*: moving a block to
 * later today re-arms it for the new time, which is the whole point of moving.
 */
const reminderKey = (block: BlockInstance) => `${block.date}:${block.id}:${block.plannedStart}`;

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(keys: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...keys]));
  } catch {
    // Private mode or storage blocked: the reminder just may repeat after a reload.
  }
}

/**
 * A clock that keeps going while the window is hidden.
 *
 * `useNow` stops in a hidden window on purpose — nothing on screen needs it. The
 * reminder is the exception: its whole job is to fire while FlexStudy sits
 * minimised behind other work. Background timers are throttled to about once a
 * minute, which is still on time for a minute-grained schedule, and showing the
 * window again catches up at once.
 */
export function useLiveMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () =>
      setNow((previous) => {
        const next = Date.now();
        return Math.floor(next / 60_000) === Math.floor(previous / 60_000) ? previous : next;
      });
    const timer = window.setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}

/**
 * Watches today's fixed-time blocks and raises a reminder when one is due.
 *
 * Desktop app: a separate always-on-top window in the corner of the screen, so
 * it is seen over a browser or an editor. Browser and Android: a card in the
 * corner of the app. Either way it offers Start focus and Skip, and Reschedule
 * once the start has passed.
 */
export function TaskReminderHost() {
  const enabled = useAppStore((state) => state.settings.taskPopup);
  const instances = useAppStore((state) => state.instances);
  const somethingRunning = useAppStore((state) =>
    state.instances.some((instance) => instance.status === "running"),
  );
  const router = useRouter();
  const pathname = usePathname();

  const now = useLiveMinute();
  const today = todayISO(now);
  const nowMinute = minuteOfDayFromEpoch(now);

  // The shell only renders after the client has mounted and loaded the
  // database, so reading sessionStorage here never meets a server render.
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  const waiting = useMemo(
    () =>
      enabled
        ? dueFixedBlocks(instances, today, nowMinute).filter(
            (block) => !dismissed.has(reminderKey(block)),
          )
        : [],
    [enabled, instances, today, nowMinute, dismissed],
  );
  const current = waiting[0] ?? null;

  const dismiss = useCallback((block: BlockInstance) => {
    setDismissed((previous) => {
      const next = new Set(previous);
      next.add(reminderKey(block));
      writeDismissed(next);
      return next;
    });
  }, []);

  /**
   * Reads the store at the moment of the click rather than closing over it: the
   * desktop window answers through an event listener registered once.
   */
  const handle = useCallback(
    (id: string, action: ReminderAction, fromWindow: boolean) => {
      const store = useAppStore.getState();
      const block = store.instances.find((instance) => instance.id === id);
      if (!block) return;
      dismiss(block);

      if (action === "start") {
        vibrate(15);
        void store.startBlock(id);
        if (fromWindow) void focusMainWindow();
        if (pathname !== "/") router.push("/");
      } else if (action === "skip") {
        void store.skipBlock(id);
      } else if (action === "reschedule") {
        if (fromWindow) void focusMainWindow();
        openReschedule(id);
      }
    },
    [dismiss, pathname, router],
  );

  // ---- Desktop: the floating window -------------------------------------
  const useWindow = supportsReminderWindow();
  const [windowFailed, setWindowFailed] = useState(false);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!useWindow || windowFailed) return;
    const key = current ? reminderKey(current) : null;
    if (key === shown.current) return;
    shown.current = key;
    if (!current || current.plannedStart === null) {
      void closeReminderWindow();
      return;
    }
    void showReminderWindow({
      id: current.id,
      title: current.title,
      date: current.date,
      start: current.plannedStart,
      durationMin: current.durationMin,
    }).then((ok) => {
      if (!ok) setWindowFailed(true);
    });
  }, [current, useWindow, windowFailed]);

  const handleRef = useRef(handle);
  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);

  useEffect(() => {
    if (!useWindow) return;
    let alive = true;
    let unlisten: (() => void) | null = null;
    void onReminderAction((id, action) => handleRef.current(id, action, true)).then((stop) => {
      if (alive) unlisten = stop;
      else stop();
    });
    return () => {
      alive = false;
      unlisten?.();
    };
  }, [useWindow]);

  // Leaving the app (or turning the setting off) takes the window with it.
  useEffect(() => {
    if (!useWindow) return;
    return () => void closeReminderWindow();
  }, [useWindow]);

  // ---- Browser and Android: the in-app card -----------------------------
  if (!current || current.plannedStart === null) return null;
  if (useWindow && !windowFailed) return null;

  const start = parseClock(current.plannedStart);
  return (
    <div
      data-print-hide
      className={cn(
        "fixed inset-x-2 z-40 lg:inset-x-auto lg:right-6 lg:w-[24rem]",
        // Above the phone tab bar, and above the running bar when one is showing.
        somethingRunning
          ? "bottom-[calc(9rem+env(safe-area-inset-bottom))] lg:bottom-28"
          : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6",
      )}
    >
      <ReminderCard
        title={current.title}
        start={start}
        end={start + Math.max(1, current.durationMin)}
        lateMinutes={minutesLate(current, today, nowMinute)}
        more={waiting.length - 1}
        onStart={() => handle(current.id, "start", false)}
        onSkip={() => handle(current.id, "skip", false)}
        onReschedule={() => handle(current.id, "reschedule", false)}
        onDismiss={() => handle(current.id, "dismiss", false)}
      />
    </div>
  );
}
