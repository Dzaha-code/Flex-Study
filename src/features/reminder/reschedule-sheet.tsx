"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { TextInput, TimeInput } from "@/components/ui/field";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import {
  fixedTiming,
  minuteOfDayFromEpoch,
  minutesLate,
  parseClock,
  rescheduleOptions,
  todayISO,
  tryParseClock,
} from "@/domain";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { closeReschedule, useRescheduleTarget } from "./reschedule-store";

/**
 * Mounted once in the shell. Opens for whichever block `openReschedule` named,
 * and closes on its own if that block stops being movable underneath it —
 * started from another device, or finished from the reminder.
 */
export function RescheduleHost() {
  const targetId = useRescheduleTarget();
  const instance = useAppStore((state) =>
    targetId ? state.instances.find((candidate) => candidate.id === targetId) : undefined,
  );

  if (!instance || instance.status !== "planned") return null;
  // Keyed by block, so every opening starts from fresh suggestions.
  return <RescheduleSheet key={instance.id} instance={instance} />;
}

function RescheduleSheet({ instance }: { instance: BlockInstance }) {
  const instances = useAppStore((state) => state.instances);
  const dayStart = useAppStore((state) => state.settings.dayStart);
  const dayEnd = useAppStore((state) => state.settings.dayEnd);
  const rescheduleBlock = useAppStore((state) => state.rescheduleBlock);
  const undoShiftEvent = useAppStore((state) => state.undoShiftEvent);
  const { t, formatDateShort, formatClockValue } = useI18n();

  // Read once when the sheet opens: the suggestions should not shift under a
  // finger that is about to tap one of them.
  const [openedAt] = useState(() => Date.now());
  const today = todayISO(openedAt);
  const nowMinute = minuteOfDayFromEpoch(openedAt);

  const options = useMemo(
    () => rescheduleOptions(instances, instance, today, nowMinute, { dayStart, dayEnd }),
    [instances, instance, today, nowMinute, dayStart, dayEnd],
  );
  const nextSlot = options.find((option) => option.kind === "nextSlot");
  const tomorrow = options.find((option) => option.kind === "tomorrow");

  const [date, setDate] = useState(() => (nextSlot ?? tomorrow)?.date ?? today);
  const [time, setTime] = useState(
    () => (nextSlot ?? tomorrow)?.start ?? instance.plannedStart ?? dayStart,
  );
  const [busy, setBusy] = useState(false);

  const timing = fixedTiming(instance, today, nowMinute);
  const start = tryParseClock(instance.plannedStart);
  const context =
    start === null
      ? null
      : timing === "late" || timing === "now"
        ? t("reschedule.late", {
            time: formatClockValue(start),
            minutes: minutesLate(instance, today, nowMinute),
          })
        : timing === "missed"
          ? t("reschedule.missed", {
              start: formatClockValue(start),
              end: formatClockValue(start + Math.max(1, instance.durationMin)),
            })
          : null;

  const customError =
    date < today
      ? t("reschedule.pastDate")
      : date === today && tryParseClock(time) !== null && parseClock(time) < nowMinute
        ? t("reschedule.pastTime")
        : null;
  const customValid = customError === null && tryParseClock(time) !== null && date !== "";

  async function move(toDate: string, toStart: string) {
    if (busy) return;
    setBusy(true);
    const event = await rescheduleBlock(instance.id, toDate, toStart);
    setBusy(false);
    closeReschedule();
    if (!event) return;
    const eventId = event.id;
    toastManager.add({
      title: t("reschedule.done", {
        date: formatDateShort(toDate),
        time: formatClockValue(parseClock(toStart)),
      }),
      description: t("shift.toastHint"),
      timeout: 10_000,
      actionProps: {
        children: t("common.undo"),
        onClick: () => {
          void undoShiftEvent(eventId);
          toastManager.add({ title: t("shift.undone"), timeout: 4_000 });
        },
      },
    });
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) closeReschedule();
      }}
      title={t("reschedule.title")}
      description={instance.title}
      footer={
        <>
          <Button variant="ghost" onClick={closeReschedule}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!customValid || busy} onClick={() => void move(date, time)}>
            {t("reschedule.apply")}
          </Button>
        </>
      }
    >
      {context ? <p className="text-meta text-ink-muted">{context}</p> : null}

      {options.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-label font-medium text-ink-muted">{t("reschedule.quick")}</span>
          <div className="flex flex-col gap-2">
            {nextSlot ? (
              <Button
                variant="secondary"
                className="justify-start"
                disabled={busy}
                onClick={() => void move(nextSlot.date, nextSlot.start)}
              >
                {t("reschedule.nextSlot", { time: formatClockValue(parseClock(nextSlot.start)) })}
              </Button>
            ) : null}
            {tomorrow ? (
              <Button
                variant="secondary"
                className="justify-start"
                disabled={busy}
                onClick={() => void move(tomorrow.date, tomorrow.start)}
              >
                {t("reschedule.tomorrow", { time: formatClockValue(parseClock(tomorrow.start)) })}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-label font-medium text-ink-muted">{t("reschedule.custom")}</span>
        <div className="flex flex-wrap items-start gap-3">
          <TextInput
            type="date"
            label={t("reschedule.date")}
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
            className="max-w-[12rem]"
          />
          <TimeInput
            label={t("reschedule.time")}
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
        {customError ? <p className="text-caption text-warn">{customError}</p> : null}
      </div>
    </Sheet>
  );
}
