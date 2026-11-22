"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { minuteOfDayFromEpoch, todayISO, tryParseClock } from "@/domain";
import { sendReminderAction, type ReminderAction, type ReminderPayload } from "@/lib/desktop";
import { ReminderCard } from "./reminder-card";
import { useLiveMinute } from "./task-reminder-host";

function subscribeToHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function readPayload(hash: string): ReminderPayload | null {
  if (hash.length < 2) return null;
  try {
    const raw = decodeURIComponent(hash.slice(1));
    const value = JSON.parse(raw) as Partial<ReminderPayload>;
    if (
      typeof value.id !== "string" ||
      typeof value.title !== "string" ||
      typeof value.date !== "string" ||
      typeof value.start !== "string" ||
      typeof value.durationMin !== "number"
    ) {
      return null;
    }
    return value as ReminderPayload;
  } catch {
    return null;
  }
}

/**
 * The page inside the desktop reminder window.
 *
 * It never loads the database — the main window owns the data. Everything it
 * shows came in the URL hash, and every button is handed back to the main
 * window as an event before this window closes itself. It keeps its own clock,
 * so "Time to start" turns into "Started 3 min ago" (and Reschedule appears)
 * while it waits on screen.
 */
export function ReminderWindow() {
  // The hash is client-only: the server and the first client render both see
  // "", so hydration matches and the card appears right after.
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const payload = useMemo(() => readPayload(hash), [hash]);
  const [answered, setAnswered] = useState(false);
  const now = useLiveMinute();

  const start = payload ? tryParseClock(payload.start) : null;
  if (!payload || start === null) return null;

  const lateMinutes =
    payload.date === todayISO(now) ? Math.max(0, minuteOfDayFromEpoch(now) - start) : 0;

  const answer = (action: ReminderAction) => {
    if (answered) return;
    setAnswered(true);
    void sendReminderAction(payload.id, action);
  };

  return (
    <ReminderCard
      title={payload.title}
      start={start}
      end={start + Math.max(1, payload.durationMin)}
      lateMinutes={lateMinutes}
      more={0}
      onStart={() => answer("start")}
      onSkip={() => answer("skip")}
      onReschedule={() => answer("reschedule")}
      onDismiss={() => answer("dismiss")}
      // The window is the card: no second border or shadow inside the frame
      // the OS already draws.
      className="h-dvh justify-center rounded-none border-0 shadow-none"
    />
  );
}
