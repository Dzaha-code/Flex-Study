"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconPlus,
  IconShuffle,
  IconUndo,
} from "@/components/ui/icons";
import { EmptyState, Panel, PanelHeader, ProgressBar, StatusBadge } from "@/components/ui/surface";
import { MATERIALISE_DAYS, useAppStore } from "@/data/store";
import {
  addDays,
  dayProgress,
  diffInDays,
  focusBlock,
  layoutDay,
  MINUTES_PER_DAY,
  minuteOfDayFromEpoch,
  parseClock,
  todayISO,
  weekdayIndex,
} from "@/domain";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { BlockTemplateForm } from "@/features/plan/block-template-form";
import { EditBlockSheet } from "@/features/plan/edit-block-sheet";
import { vibrate } from "@/lib/alarm";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { HeaderClock } from "./header-clock";
import { NoteDetailSheet } from "./note-detail-sheet";
import { ShiftSheet } from "./shift-sheet";
import { NoteSheet, Timeline, type CategoryLookup, type DayKind } from "./timeline";
import { useDueReminders } from "./use-reminders";

type SlideDirection = "forward" | "back" | "none";

/**
 * Horizontal swipe on the timeline moves a day, the way a calendar app does on
 * a phone. Touch only: a mouse drag on desktop selects text, as it should.
 * A swipe has to be clearly sideways, so scrolling the timeline never flips
 * the day by accident.
 */
function useDaySwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  return {
    onTouchStart: (event: React.TouchEvent) => {
      const target = event.target as HTMLElement;
      if (event.touches.length !== 1 || target.closest("input, textarea, select, [role=dialog]")) {
        start.current = null;
        return;
      }
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (Date.now() - from.t > 700) return;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

/**
 * The day's blocks are generated lazily for a rolling window. Materialisation
 * starts today, so past days only ever show what actually happened.
 *
 * Today is the home, but not a cage: the day strip opens any other day in the
 * same view, so yesterday's blocks and next week's plan read exactly like
 * today's.
 */
export function TodayScreen() {
  const [today] = useState(() => todayISO(Date.now()));
  const [selected, setSelected] = useState(today);
  const [direction, setDirection] = useState<SlideDirection>("none");
  const ensureRange = useAppStore((state) => state.ensureRange);

  useEffect(() => {
    void ensureRange(today, addDays(today, MATERIALISE_DAYS));
  }, [today, ensureRange]);

  // Paging past the rolling window still shows the plan for that day.
  useEffect(() => {
    if (selected > addDays(today, MATERIALISE_DAYS)) void ensureRange(selected, selected);
  }, [selected, today, ensureRange]);

  const select = (next: string) => {
    if (next === selected) return;
    setDirection(next > selected ? "forward" : "back");
    setSelected(next);
  };

  return <TodayContent date={selected} today={today} direction={direction} onSelectDate={select} />;
}

/**
 * Seven days at a glance, and the way to open any of them.
 *
 * It starts on the last seven days, ending today, so the streak reading it
 * always had stays the default. The arrows page a week at a time in either
 * direction, and tapping a day opens it in the timeline above.
 */
function DayStrip({
  today,
  selected,
  instances,
  onSelect,
}: {
  today: string;
  selected: string;
  instances: BlockInstance[];
  onSelect: (date: string) => void;
}) {
  const { t, formatWeekdayShort, formatDateShort } = useI18n();

  // Which week-long window is shown: 0 ends today, -1 the week before, 1 the next.
  const windowFor = (date: string) => Math.ceil(diffInDays(today, date) / 7);
  const [offset, setOffset] = useState(() => windowFor(selected));
  // Follow the selection when it leaves the window by other means ("Back to
  // today"), but never fight the arrows. Adjusting state during render on a
  // changed prop is React's own pattern for this; no effect, no extra paint.
  const [seen, setSeen] = useState(selected);
  if (seen !== selected) {
    setSeen(selected);
    const end = addDays(today, offset * 7);
    if (selected > end || selected < addDays(end, -6)) setOffset(windowFor(selected));
  }

  const end = addDays(today, offset * 7);
  const days = Array.from({ length: 7 }, (_, index) => addDays(end, index - 6));

  const summary = useMemo(() => {
    const byDay = new Map<string, { total: number; done: number }>();
    for (const day of days) byDay.set(day, { total: 0, done: 0 });
    for (const instance of instances) {
      const entry = byDay.get(instance.date);
      if (!entry) continue;
      // Same rule as the day header: skipped and moved blocks leave the
      // timeline, so they leave this count too, or 3/3 above reads 3/4 here.
      if (instance.status === "deferred" || instance.status === "skipped") continue;
      entry.total += 1;
      if (instance.status === "done") entry.done += 1;
    }
    return byDay;
    // `days` is derived from `end`, which is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, end]);

  const title =
    offset === 0
      ? t("today.streak")
      : t("today.stripRange", { from: formatDateShort(days[0]), to: formatDateShort(days[6]) });

  return (
    <Panel>
      <PanelHeader
        title={title}
        headingLevel={3}
        description={t("today.stripHint")}
        action={
          <div className="flex items-center gap-0.5">
            <IconButton label={t("today.stripPrev")} onClick={() => setOffset((value) => value - 1)}>
              <IconArrowLeft />
            </IconButton>
            <IconButton label={t("today.stripNext")} onClick={() => setOffset((value) => value + 1)}>
              <IconArrowRight />
            </IconButton>
          </div>
        }
      />
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const { total, done } = summary.get(day) ?? { total: 0, done: 0 };
          const isToday = day === today;
          const isSelected = day === selected;
          const future = day > today;
          const ratio = total === 0 ? 0 : done / total;
          const status =
            total === 0
              ? t("today.streakEmpty")
              : t("today.stripStatus", { done, total });
          return (
            <li key={day} className="flex">
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={isSelected}
                aria-label={t("today.streakDay", { date: formatDateShort(day), status })}
                className={cn(
                  "day-chip flex w-full flex-col items-center gap-1 rounded-ctl border px-1 pb-2 pt-1.5",
                  isSelected
                    ? "day-chip-selected border-ink bg-raised"
                    : "border-transparent hover:border-line hover:bg-accent-surface",
                )}
              >
                <span
                  className={cn(
                    "text-label",
                    isToday ? "stabilo !px-1.5 !text-[12px]" : "text-ink-muted",
                  )}
                >
                  {formatWeekdayShort(day)}
                </span>
                <span
                  className={cn(
                    "text-numeral font-semibold tabular-nums",
                    future && !isSelected && "text-ink-muted",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {/* How much of that day got done, as a ruled line: full ink
                    when every block is finished, empty paper when none is. */}
                <span aria-hidden="true" className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      ratio === 1 ? "bg-ok" : "bg-ink",
                    )}
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </span>
                <span className="text-[11px] leading-none text-ink-muted tabular-nums">
                  {total === 0 ? "·" : `${done}/${total}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function TodayContent({
  date,
  today,
  direction,
  onSelectDate,
}: {
  date: string;
  today: string;
  direction: SlideDirection;
  onSelectDate: (date: string) => void;
}) {
  const instances = useAppStore((state) => state.instances);
  const categories = useAppStore((state) => state.categories);
  const planSize = useAppStore((state) => state.templates.length);
  const restoreSkippedBlock = useAppStore((state) => state.restoreSkippedBlock);
  const dayStart = useAppStore((state) => state.settings.dayStart);
  const remindersEnabled = useAppStore((state) => state.settings.remindersEnabled);
  const { t, formatDateLong, formatDateShort, formatMinutes } = useI18n();

  const [shiftOpen, setShiftOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<BlockInstance | null>(null);
  const [noteDetailTarget, setNoteDetailTarget] = useState<BlockInstance | null>(null);
  const [editTarget, setEditTarget] = useState<BlockInstance | null>(null);

  const dayKind: DayKind = date === today ? "today" : date < today ? "past" : "future";
  const isToday = dayKind === "today";

  /**
   * The row icon reads before it writes: a block that already carries a note
   * opens that note; one that does not opens the editor, so writing stays one
   * tap away from anywhere.
   */
  function quickNote(instance: BlockInstance) {
    if (instance.note.trim() !== "") setNoteDetailTarget(instance);
    else setNoteTarget(instance);
  }

  const dayBlocks = useMemo(
    () => instances.filter((instance) => instance.date === date),
    [instances, date],
  );

  const timeline = useMemo(
    () => layoutDay(dayBlocks, { dayStartMinute: parseClock(dayStart) }),
    [dayBlocks, dayStart],
  );

  // This clock only has to keep up with the minute. The second-by-second tick
  // lives inside the timer leaves themselves (ToApk.md §7 D1.2).
  const now = useNow(true, 30_000);
  // Another day has no "now": a past day is over, a future one has not begun.
  const nowMinute = isToday ? minuteOfDayFromEpoch(now) : dayKind === "past" ? MINUTES_PER_DAY : 0;

  const progress = useMemo(() => dayProgress(timeline, nowMinute), [timeline, nowMinute]);
  const focus = useMemo(
    () => (isToday ? focusBlock(timeline, nowMinute) : null),
    [timeline, nowMinute, isToday],
  );
  const categoryById: CategoryLookup = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  useDueReminders(remindersEnabled && isToday, timeline, nowMinute);

  const leftovers = dayBlocks.filter(
    (instance) => instance.status === "deferred" || instance.status === "skipped",
  );

  const offsetDays = diffInDays(today, date);
  const relativeLabel =
    offsetDays === -1
      ? t("today.relative.yesterday")
      : offsetDays === 1
        ? t("today.relative.tomorrow")
        : offsetDays < 0
          ? t("today.relative.daysAgo", { count: -offsetDays })
          : offsetDays > 0
            ? t("today.relative.inDays", { count: offsetDays })
            : null;

  const progressLine =
    progress.totalCount === 0
      ? isToday
        ? t("today.empty.title")
        : t("today.otherDay.empty")
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

  const slideClass =
    direction === "forward" ? "day-slide-forward" : direction === "back" ? "day-slide-back" : undefined;

  const swipe = useDaySwipe((step) => {
    vibrate(10);
    onSelectDate(addDays(date, step));
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3" data-tour="progress">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div key={date} className={cn("flex flex-col gap-1", slideClass)}>
            {relativeLabel ? (
              <p>
                <span className="stabilo">{relativeLabel}</span>
              </p>
            ) : null}
            <h1 className="text-display">{formatDateLong(date)}</h1>
            <p className="text-meta text-ink-muted">{progressLine}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isToday ? (
              <HeaderClock />
            ) : (
              <Button variant="primary" onClick={() => onSelectDate(today)}>
                {t("today.backToToday")}
              </Button>
            )}
            {/* 3.6d: the second door into templates — the tour names both this
                and Atur → Template, and points at each marker in turn. */}
            <Link
              href="/settings"
              data-tour="today-templates"
              className="inline-flex h-11 items-center rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
            >
              {t("settings.templates")}
            </Link>
            {/* Rescheduling is about the day in progress, so it only lives on
                today. Its own target: the tour points at it on its own step. */}
            {isToday ? (
              <Button data-tour="shift" variant="secondary" onClick={() => setShiftOpen(true)}>
                <IconShuffle />
                {t("today.messy")}
              </Button>
            ) : null}
          </div>
        </div>
        <ProgressBar
          value={progress.ratio}
          label={t("a11y.progress", {
            done: progress.doneCount,
            total: progress.totalCount,
          })}
        />
      </header>

      {/* The day picker sits above the timeline it drives, so the cause and
          the effect are on screen together. */}
      <div data-tour="streak">
        <DayStrip today={today} selected={date} instances={instances} onSelect={onSelectDate} />
      </div>

      <div
        key={date}
        className={cn("flex touch-pan-y flex-col gap-6", slideClass)}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        {timeline.length === 0 ? (
          /**
           * Two different emptinesses, told apart: nothing has ever been planned,
           * or a plan exists and simply has no block on this weekday. Saying "no
           * blocks yet" in the second case reads as "the template never applied".
           */
          <EmptyState
            title={
              !isToday
                ? t("today.otherDay.empty")
                : planSize > 0
                  ? t("today.emptyPlanned.title")
                  : t("today.empty.title")
            }
            body={
              !isToday
                ? t("today.otherDay.emptyBody")
                : planSize > 0
                  ? t("today.emptyPlanned.body", { count: planSize })
                  : t("today.empty.body")
            }
            action={
              // Its own target: with no blocks there is no focus card to point
              // at, and the tour adapts to exactly this state.
              <Button data-tour="first-block" onClick={() => setAddOpen(true)}>
                <IconPlus />
                {t("today.empty.addBlock")}
              </Button>
            }
            secondaryAction={
              isToday ? (
                <Link
                  href={planSize > 0 ? "/week" : "/settings"}
                  className="inline-flex h-11 items-center rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
                >
                  {planSize > 0 ? t("today.emptyPlanned.cta") : t("today.empty.cta")}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Timeline
            blocks={timeline}
            nowMinute={nowMinute}
            focusId={focus?.instance.id ?? null}
            dayKind={dayKind}
            categoryById={categoryById}
            onOpenNote={setNoteTarget}
            onQuickNote={quickNote}
            onEditBlock={setEditTarget}
          />
        )}
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
                <div className="flex items-center gap-2">
                  <StatusBadge status={instance.status} />
                  {/* Only a skip is reversible here. A moved block already has
                      a copy on another day, so offering "put back" would
                      duplicate it rather than undo anything. */}
                  {instance.status === "skipped" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void restoreSkippedBlock(instance.id)}
                    >
                      <IconUndo size={16} />
                      {t("today.undoSkip")}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

        <div data-tour="add">
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            <IconPlus />
            {isToday ? t("today.addBlock") : t("today.addBlockOn", { date: formatDateShort(date) })}
          </Button>
        </div>

        {leftovers.length > 0 ? (
          <Panel>
            <PanelHeader
              title={isToday ? t("today.notWorked") : t("today.notWorkedOther")}
              headingLevel={3}
            />
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
      </div>

      {/* Today stays a seven-day view on purpose; the wider picture lives one
          step away instead of being crowded in here. */}
      <Link
        href="/recap"
        data-tour="recap"
        className="inline-flex h-11 w-fit items-center gap-2 rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
      >
        <IconCalendar size={16} />
        {t("today.openRecap")}
      </Link>

      <ShiftSheet open={shiftOpen} onOpenChange={setShiftOpen} date={today} />
      {addOpen ? (
        <BlockTemplateForm
          initial={{
            title: "",
            categoryId: categories[0]?.id ?? "",
            durationMin: 45,
            days: [weekdayIndex(date)],
            plannedStart: null,
          }}
          defaultDate={date}
          defaultRepeat="once"
          onClose={() => setAddOpen(false)}
        />
      ) : null}
      {noteTarget ? <NoteSheet instance={noteTarget} onClose={() => setNoteTarget(null)} /> : null}
      {/* The detail sheet swaps, never stacks: one dialog at a time, or the two
          fight over the same layer and the same focus trap. */}
      {noteDetailTarget ? (
        <NoteDetailSheet
          instance={noteDetailTarget}
          onClose={() => setNoteDetailTarget(null)}
          onEdit={(instance) => {
            setNoteDetailTarget(null);
            setNoteTarget(instance);
          }}
          onOpenBlock={(instance) => {
            setNoteDetailTarget(null);
            setEditTarget(instance);
          }}
        />
      ) : null}
      {editTarget ? (
        <EditBlockSheet instance={editTarget} onClose={() => setEditTarget(null)} />
      ) : null}
    </div>
  );
}
