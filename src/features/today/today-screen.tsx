"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconPlus, IconShuffle } from "@/components/ui/icons";
import { EmptyState, Panel, PanelHeader, ProgressBar, StatusBadge } from "@/components/ui/surface";
import { MATERIALISE_DAYS, useAppStore } from "@/data/store";
import {
  addDays,
  dayProgress,
  focusBlock,
  layoutDay,
  minuteOfDayFromEpoch,
  parseClock,
  todayISO,
} from "@/domain";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { EditBlockSheet } from "@/features/plan/edit-block-sheet";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { ShiftSheet } from "./shift-sheet";
import { TimerWatcher } from "./running-timer";
import { AddBlockSheet, NoteSheet, Timeline, type CategoryLookup } from "./timeline";
import { useDueReminders } from "./use-reminders";

/**
 * The day's blocks are generated lazily for a rolling window. Materialisation
 * starts today, so past days only ever show what actually happened.
 */
export function TodayScreen() {
  const [date] = useState(() => todayISO(Date.now()));
  const ensureRange = useAppStore((state) => state.ensureRange);

  useEffect(() => {
    void ensureRange(date, addDays(date, MATERIALISE_DAYS));
  }, [date, ensureRange]);

  return <TodayContent date={date} />;
}

function StreakStrip({ anchor, instances }: { anchor: string; instances: BlockInstance[] }) {
  const { t, formatWeekdayShort, formatDateShort } = useI18n();
  const days = Array.from({ length: 7 }, (_, index) => addDays(anchor, index - 6));

  return (
    <Panel>
      <PanelHeader title={t("today.streak")} headingLevel={3} />
      <ol className="flex items-stretch gap-1.5">
        {days.map((day) => {
          const finished = instances.some(
            (instance) => instance.date === day && instance.status === "done",
          );
          const isToday = day === anchor;
          return (
            <li key={day} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "h-9 w-full rounded-[6px] border",
                  finished ? "border-ok bg-ok" : "border-line bg-surface",
                )}
              />
              <span
                className={cn(
                  "text-label",
                  isToday ? "font-semibold text-accent" : "text-ink-muted",
                )}
              >
                {formatWeekdayShort(day)}
              </span>
              <span className="sr-only">
                {t("today.streakDay", {
                  date: formatDateShort(day),
                  status: finished ? t("today.streakFilled") : t("today.streakEmpty"),
                })}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function TodayContent({ date }: { date: string }) {
  const instances = useAppStore((state) => state.instances);
  const categories = useAppStore((state) => state.categories);
  const dayStart = useAppStore((state) => state.settings.dayStart);
  const remindersEnabled = useAppStore((state) => state.settings.remindersEnabled);
  const { t, formatDateLong, formatDateShort, formatMinutes } = useI18n();

  const [shiftOpen, setShiftOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<BlockInstance | null>(null);
  const [editTarget, setEditTarget] = useState<BlockInstance | null>(null);

  const todayBlocks = useMemo(
    () => instances.filter((instance) => instance.date === date),
    [instances, date],
  );

  const timeline = useMemo(
    () => layoutDay(todayBlocks, { dayStartMinute: parseClock(dayStart) }),
    [todayBlocks, dayStart],
  );

  const hasRunning = timeline.some((block) => block.instance.status === "running");

  // This clock only has to keep up with the minute. The second-by-second tick
  // lives inside the timer leaves themselves (ToApk.md §7 D1.2), so a running
  // timer no longer re-renders the whole screen sixty times a minute.
  const now = useNow(true, 30_000);
  const nowMinute = minuteOfDayFromEpoch(now);

  const progress = useMemo(() => dayProgress(timeline, nowMinute), [timeline, nowMinute]);
  const focus = useMemo(() => focusBlock(timeline, nowMinute), [timeline, nowMinute]);
  const categoryById: CategoryLookup = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  useDueReminders(remindersEnabled, timeline, nowMinute);

  const leftovers = todayBlocks.filter(
    (instance) => instance.status === "deferred" || instance.status === "skipped",
  );

  const progressLine =
    progress.totalCount === 0
      ? t("today.empty.title")
      : progress.remainingMinutes > 0
        ? t("today.progress", {
            done: progress.doneCount,
            total: progress.totalCount,
            remaining: formatMinutes(progress.remainingMinutes),
          })
        : t("today.progressDone", {
            done: progress.doneCount,
            total: progress.totalCount,
          });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3" data-tour="progress">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-display">{formatDateLong(date)}</h1>
            <p className="text-meta text-ink-muted">{progressLine}</p>
          </div>
          {/* Its own target, not part of `progress`: the tour points at this
              button on its own step, and a shared target would highlight the
              whole header twice. */}
          <Button data-tour="shift" variant="secondary" onClick={() => setShiftOpen(true)}>
            <IconShuffle />
            {t("today.messy")}
          </Button>
        </div>
        <ProgressBar
          value={progress.ratio}
          label={t("a11y.progress", {
            done: progress.doneCount,
            total: progress.totalCount,
          })}
        />
      </header>

      {/* Renders nothing. It owns the one-second clock that fires the "block
          finished" notification, so the rest of the screen stays still. */}
      <TimerWatcher enabled={remindersEnabled} running={hasRunning} blocks={timeline} />

      {timeline.length === 0 ? (
        <EmptyState
          title={t("today.empty.title")}
          body={t("today.empty.body")}
          action={
            <Button onClick={() => setAddOpen(true)}>
              <IconPlus />
              {t("today.empty.addBlock")}
            </Button>
          }
          secondaryAction={
            <Link
              href="/settings"
              className="inline-flex h-11 items-center rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
            >
              {t("today.empty.cta")}
            </Link>
          }
        />
      ) : (
        <Timeline
          blocks={timeline}
          nowMinute={nowMinute}
          focusId={focus?.instance.id ?? null}
          categoryById={categoryById}
          onOpenNote={setNoteTarget}
          onEditBlock={setEditTarget}
        />
      )}

      <div data-tour="add">
        <Button variant="secondary" onClick={() => setAddOpen(true)}>
          <IconPlus />
          {t("today.addBlock")}
        </Button>
      </div>

      {leftovers.length > 0 ? (
        <Panel>
          <PanelHeader title={t("today.notWorked")} headingLevel={3} />
          <ul className="flex flex-col divide-y divide-line">
            {leftovers.map((instance) => (
              <li
                key={instance.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-body text-ink-muted">{instance.title}</span>
                  <span className="text-label text-ink-muted">
                    {instance.movedTo
                      ? t("today.movedTo", { date: formatDateShort(instance.movedTo) })
                      : t("status.skipped")}
                  </span>
                </div>
                <StatusBadge status={instance.status} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div data-tour="streak">
        <StreakStrip anchor={date} instances={instances} />
      </div>

      {/* Today stays a seven-day view on purpose; the wider picture lives one
          step away instead of being crowded in here. */}
      <Link
        href="/recap"
        className="inline-flex h-11 w-fit items-center gap-2 rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
      >
        <IconCalendar size={16} />
        {t("today.openRecap")}
      </Link>

      <ShiftSheet open={shiftOpen} onOpenChange={setShiftOpen} date={date} />
      {addOpen ? <AddBlockSheet date={date} onClose={() => setAddOpen(false)} /> : null}
      {noteTarget ? <NoteSheet instance={noteTarget} onClose={() => setNoteTarget(null)} /> : null}
      {editTarget ? (
        <EditBlockSheet instance={editTarget} onClose={() => setEditTarget(null)} />
      ) : null}
    </div>
  );
}
