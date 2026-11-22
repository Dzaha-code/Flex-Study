"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { NumberInput, TextInput, TimeInput } from "@/components/ui/field";
import {
  IconCaretDown,
  IconCheck,
  IconNote,
  IconPause,
  IconPencil,
  IconPlay,
  IconShuffle,
  IconSkip,
  IconUndo,
  IconWarning,
} from "@/components/ui/icons";
import { CategoryTag, StatusBadge } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import { CategoryPicker } from "@/features/plan/category-picker";
import type { LaidOutBlock } from "@/domain/schedule";
import { notePreview } from "@/domain/notes";
import { canReschedule, fixedTiming, minutesLate } from "@/domain/reschedule";
import { canPause, canResume } from "@/domain/status";
import { minuteOfDayFromEpoch, todayISO } from "@/domain/time";
import type { BlockInstance, Category } from "@/domain/types";
import { useI18n } from "@/i18n";
import { primeAlarm, vibrate } from "@/lib/alarm";
import { useJustChanged } from "@/lib/ink";
import { hasMarkup, renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { openReschedule } from "@/features/reminder/reschedule-store";
import { Countdown, FocusTimer } from "./running-timer";

export type CategoryLookup = Map<string, Category>;

function Markers({ status, overlap }: { status: BlockInstance["status"]; overlap: boolean }) {
  if (overlap) {
    return <IconWarning width={14} height={14} className="text-warn" />;
  }
  if (status === "done") {
    return <IconCheck width={14} height={14} className="text-ok" />;
  }
  if (status === "running") {
    return <IconPlay width={12} height={12} className="text-accent" />;
  }
  if (status === "paused") {
    return <IconPause width={12} height={12} className="text-warn" />;
  }
  return null;
}

/**
 * Isi (DESIGN.md v3 §4 #5): the dot fills from its centre once, on the
 * transition into done. A row that loads already-done stays still — nothing
 * happened just then, and decorative motion on mount is exactly what §0
 * forbids. The colours are untouched: this is status, and status keeps its
 * palette (§2.2).
 */
function TimelineDot({ status }: { status: BlockInstance["status"] }) {
  const justDone = useJustChanged(status === "done");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -left-[5px] top-[1.15rem] size-[9px] rounded-full border",
        status === "done" && "border-ok bg-ok",
        status === "running" && "border-accent bg-accent",
        // Paused keeps the accent border but hollow: still today's work, just
        // not moving — the badge and the Resume button say the rest.
        status === "paused" && "border-accent bg-surface",
        (status === "planned" || status === "deferred" || status === "skipped") &&
          "border-line-strong bg-surface",
        justDone && "ink-fill-dot",
      )}
    />
  );
}

/**
 * Isi for the whole row (§4 #5, §6 "Baris blok → selesai"): one lime sheet
 * crosses the cell in 280 ms when this block is completed, then is removed
 * from the DOM entirely — one pass, never a loop, never while idle.
 */
function RowSweep({ status }: { status: BlockInstance["status"] }) {
  const justDone = useJustChanged(status === "done");
  if (!justDone) return null;
  return <span aria-hidden="true" className="ink-sweep" />;
}

/** The line the whole screen is built around: the clock on the left, the plan on the right. */
function NowMarker({ nowMinute }: { nowMinute: number }) {
  const { t, formatClockValue } = useI18n();
  const label = t("today.nowMarker", { time: formatClockValue(nowMinute) });

  return (
    // The one signature element of the whole design: a stabilo label plus a 2px
    // rule. On light paper --hl is only 1.10:1, so the rule uses --hl-rule,
    // which clears 3:1 while keeping the hue (DESIGN.md §5).
    //
    // The label sits in the content column, not the clock column. Clock labels
    // are ~38px and fit the 3.25–4rem axis; "sekarang 21:31" is ~111px in either
    // language, so right-aligning it inside that column pushed its left end out
    // of the timeline — off the edge of a phone, and under the sticky sidebar on
    // a desktop, which is what sliced the first letters off. Started at the axis
    // instead, with the rule taking whatever width is left, nothing overflows.
    <div className="flex items-center gap-3 py-1.5 pl-[3.25rem] sm:pl-16">
      <span aria-hidden="true" className="stabilo whitespace-nowrap">
        {label}
      </span>
      <span aria-hidden="true" className="h-0.5 min-w-0 flex-1 rounded-full bg-hl-rule" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Where the shown day sits relative to today. Only today can start a timer;
 * a past day can still be settled (done, skipped) after the fact, and a future
 * day is for reading and editing the plan.
 */
export type DayKind = "past" | "today" | "future";

/**
 * The real date and minute a block is judged against. The timeline passes a
 * synthetic minute for other days (0 for the future, the end of day for the
 * past), so only today uses the minute it was given.
 */
function clockFor(dayKind: DayKind, nowMinute: number): { today: string; minute: number } {
  const now = Date.now();
  return { today: todayISO(now), minute: dayKind === "today" ? nowMinute : minuteOfDayFromEpoch(now) };
}

/**
 * A fixed-time block whose start passed without a start reads as late, then as
 * missed once its slot is over. Status, so it takes the status colour.
 */
function LateTag({
  instance,
  dayKind,
  nowMinute,
}: {
  instance: BlockInstance;
  dayKind: DayKind;
  nowMinute: number;
}) {
  const { t } = useI18n();
  if (dayKind === "future") return null;
  const { today, minute } = clockFor(dayKind, nowMinute);
  const timing = fixedTiming(instance, today, minute);
  if (timing !== "late" && timing !== "missed") return null;
  return (
    <span className="shrink-0 rounded-[4px] bg-warn-surface px-1.5 py-px text-label font-semibold text-warn">
      {timing === "late"
        ? t("today.lateTag", { minutes: minutesLate(instance, today, minute) })
        : t("today.missedTag")}
    </span>
  );
}

function BlockActions({
  instance,
  dayKind,
  nowMinute,
}: {
  instance: BlockInstance;
  dayKind: DayKind;
  nowMinute: number;
}) {
  const startBlock = useAppStore((state) => state.startBlock);
  const pauseBlock = useAppStore((state) => state.pauseBlock);
  const resumeBlock = useAppStore((state) => state.resumeBlock);
  const completeBlock = useAppStore((state) => state.completeBlock);
  const resetBlock = useAppStore((state) => state.resetBlock);
  const skipBlock = useAppStore((state) => state.skipBlock);
  const restoreSkippedBlock = useAppStore((state) => state.restoreSkippedBlock);
  const { t } = useI18n();
  const clock = clockFor(dayKind, nowMinute);
  // Counts the taps instead of a boolean, so a fresh ripple element is mounted
  // per press and the animation replays without any cleanup state.
  const [ripple, setRipple] = useState(0);

  return (
    <>
      {instance.status === "planned" && dayKind === "today" ? (
        // The wrapper is only here to anchor the ripple; it is sized by the
        // button inside it, so it changes nothing about the card's layout.
        <span className="relative inline-flex">
          <Button
            size="md"
            variant="primary"
            // This button already owns the one lime spread of the screen
            // (focus-ripple below) — Riak must not answer the same press twice.
            data-ink-ripple="off"
            onClick={() => {
              setRipple((count) => count + 1);
              // The tap is the user gesture the alarm needs to be allowed to
              // make sound when this block ends, possibly in another window.
              primeAlarm();
              vibrate(15);
              void startBlock(instance.id);
            }}
          >
            <IconPlay />
            {t("common.start")}
          </Button>
          {ripple > 0 ? (
            <span key={ripple} className="focus-ripple rounded-control" aria-hidden="true" />
          ) : null}
        </span>
      ) : null}
      {instance.status === "planned" && dayKind === "past" ? (
        <Button size="md" variant="primary" onClick={() => void completeBlock(instance.id)}>
          <IconCheck />
          {t("today.markDone")}
        </Button>
      ) : null}
      {instance.status === "running" ? (
        <Button size="md" variant="primary" onClick={() => void completeBlock(instance.id)}>
          <IconCheck />
          {t("common.finish")}
        </Button>
      ) : null}
      {/* Flexible blocks only (see `canPause`): a frozen countdown on a
          fixed-time block would still claim its slot on the clock. Pausing
          banks the measured seconds, so nothing is lost by stepping away.
          Settling work belongs to today and the past; a future day is for
          reading and editing the plan. */}
      {dayKind !== "future" && canPause(instance) ? (
        <Button size="sm" variant="ghost" onClick={() => void pauseBlock(instance.id)}>
          <IconPause />
          {t("today.pause")}
        </Button>
      ) : null}
      {canResume(instance) ? (
        <Button
          size="md"
          variant={dayKind === "today" ? "primary" : "ghost"}
          onClick={() => void resumeBlock(instance.id)}
        >
          <IconPlay />
          {t("today.resume")}
        </Button>
      ) : null}
      {instance.status === "done" || instance.status === "skipped" ? (
        <Button size="sm" variant="ghost" onClick={() => void resetBlock(instance.id)}>
          <IconUndo />
          {t("common.reset")}
        </Button>
      ) : null}
      {dayKind !== "future" && canReschedule(instance, clock.today, clock.minute) ? (
        <Button size="md" variant="secondary" onClick={() => openReschedule(instance.id)}>
          <IconShuffle />
          {t("reminder.reschedule")}
        </Button>
      ) : null}
      {/* The skip button is offered while work remains — running, paused or
          planned — because a paused block is still a block the user may decide
          not to finish after all. Never on a future day: there is nothing to
          give up on yet. */}
      {dayKind !== "future" &&
      (instance.status === "planned" ||
        instance.status === "running" ||
        instance.status === "paused") ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void skipBlock(instance.id).then(() => {
              // The row leaves the timeline the moment it is skipped, so the
              // toast is the only place left to take it back — and for six
              // seconds it is enough.
              toastManager.add({
                title: t("today.skippedToast", { title: instance.title }),
                timeout: 6_000,
                actionProps: {
                  children: t("common.undo"),
                  onClick: () => void restoreSkippedBlock(instance.id),
                },
              });
            });
          }}
        >
          <IconSkip />
          {t("common.skip")}
        </Button>
      ) : null}
    </>
  );
}

/**
 * The open block: everything about it, and the buttons that act on it.
 *
 * Any block opens into this card with one tap on its row — there is no need to
 * press Start just to see the details. Only one card is open at a time, and
 * the block in focus is open by default.
 */
function BlockCard({
  instance,
  category,
  isFocus,
  dayKind,
  nowMinute,
  startLabel,
  onCollapse,
  onOpenNote,
  onEditBlock,
}: {
  instance: BlockInstance;
  category: Category | undefined;
  /** The block nearest to now: it keeps the "in focus" label. */
  isFocus: boolean;
  dayKind: DayKind;
  nowMinute: number;
  startLabel: string;
  onCollapse: () => void;
  onOpenNote: (instance: BlockInstance) => void;
  onEditBlock: (instance: BlockInstance) => void;
}) {
  const { t } = useI18n();
  const note = instance.note.trim();

  return (
    // The open block is the strongest line on the page: 1.5px of ink, the one
    // highlight per screen (DESIGN.md §5).
    <div className="block-open surface-active flex flex-col gap-3 p-5" data-tour="focus">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={onCollapse}
          aria-expanded="true"
          aria-label={t("today.collapseBlock", { title: instance.title })}
          className="flex min-w-0 flex-1 flex-col gap-1 rounded-ctl text-left"
        >
          <p className="flex flex-wrap items-center gap-2">
            {isFocus ? <span className="stabilo">{t("today.focusTitle")}</span> : null}
            <span className="text-label text-ink-muted">{startLabel}</span>
            <LateTag instance={instance} dayKind={dayKind} nowMinute={nowMinute} />
          </p>
          <h3 className="text-title-2">{instance.title}</h3>
        </button>
        <div className="flex items-center gap-1">
          <StatusBadge status={instance.status} />
          <IconButton label={t("today.collapseBlock", { title: instance.title })} onClick={onCollapse}>
            <IconCaretDown size={18} className="rotate-180" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {category ? <CategoryTag name={category.name} icon={category.icon} /> : null}
        {instance.templateId === null ? (
          <span className="text-label text-ink-muted">{t("today.oneOffTag")}</span>
        ) : null}
      </div>

      {/* Countdown, remaining label and rule tick together inside FocusTimer,
          which owns the only one-second clock on this screen (ToApk.md §7). */}
      <FocusTimer instance={instance} />

      {note ? (
        <button
          type="button"
          onClick={() => onOpenNote(instance)}
          className="rounded-panel border border-line bg-surface p-3 text-left text-meta text-ink hover:bg-accent-surface"
        >
          <span className="line-clamp-3">{notePreview(note, 280)}</span>
        </button>
      ) : null}

      {dayKind === "future" && instance.status === "planned" ? (
        <p className="text-caption text-mute">{t("today.futureHint")}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <BlockActions instance={instance} dayKind={dayKind} nowMinute={nowMinute} />
        <Button size="md" variant="secondary" onClick={() => onOpenNote(instance)}>
          <IconNote />
          {t("today.note")}
        </Button>
        <Button size="md" variant="ghost" onClick={() => onEditBlock(instance)}>
          <IconPencil />
          {t("today.editBlock")}
        </Button>
      </div>
    </div>
  );
}

function CompactRow({
  instance,
  category,
  dayKind,
  nowMinute,
  onOpen,
  onQuickNote,
  onEditBlock,
}: {
  instance: BlockInstance;
  category: Category | undefined;
  dayKind: DayKind;
  nowMinute: number;
  /** Tapping the row opens the block's card: details and Start in one place. */
  onOpen: () => void;
  /**
   * The row icon: reading first. A row that already carries a note opens it;
   * one that does not still opens the editor, so writing is never a tap away.
   */
  onQuickNote: (instance: BlockInstance) => void;
  onEditBlock: (instance: BlockInstance) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-x-2 py-1">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded="false"
        aria-label={t("today.openBlock", { title: instance.title })}
        className="block-row flex min-w-0 flex-1 flex-col gap-0.5 rounded-ctl px-2 py-2 text-left hover:bg-accent-surface"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "truncate text-body",
              (instance.status === "done" || instance.status === "skipped") &&
                "text-ink-muted",
              instance.status === "skipped" && "line-through",
            )}
          >
            {instance.title}
          </span>
          {instance.status !== "planned" ? (
            <StatusBadge status={instance.status} className="shrink-0" />
          ) : (
            <LateTag instance={instance} dayKind={dayKind} nowMinute={nowMinute} />
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {category ? <CategoryTag name={category.name} icon={category.icon} /> : null}
          <Countdown instance={instance} />
          {instance.templateId === null ? (
            <span className="text-label text-ink-muted">· {t("today.oneOffTag")}</span>
          ) : null}
          {instance.note.trim() ? (
            <span className="text-label text-ink-muted">· {t("today.note")}</span>
          ) : null}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        {/* Reading first, and visible at a glance: a row that carries a note
            lights its icon, so "which blocks have notes?" needs no scanning. */}
        <IconButton
          label={`${t("today.note")}: ${instance.title}`}
          onClick={() => onQuickNote(instance)}
          className={instance.note.trim() ? "text-accent" : undefined}
        >
          <IconNote />
        </IconButton>
        <IconButton
          label={`${t("today.editBlock")}: ${instance.title}`}
          onClick={() => onEditBlock(instance)}
        >
          <IconPencil />
        </IconButton>
      </div>
    </div>
  );
}

/** "none" means the user closed every card; `null` means "follow the focus". */
type OpenChoice = string | "none" | null;

export function Timeline({
  blocks,
  nowMinute,
  focusId,
  dayKind,
  categoryById,
  onOpenNote,
  onQuickNote,
  onEditBlock,
}: {
  blocks: LaidOutBlock[];
  nowMinute: number;
  focusId: string | null;
  dayKind: DayKind;
  categoryById: CategoryLookup;
  /** The card's button: writing, straight into the editor. */
  onOpenNote: (instance: BlockInstance) => void;
  /** A compact row's icon: reading a note that exists, writing one that does not. */
  onQuickNote: (instance: BlockInstance) => void;
  onEditBlock: (instance: BlockInstance) => void;
}) {
  const { t, formatClockValue } = useI18n();
  const [choice, setChoice] = useState<OpenChoice>(null);
  const showNow = dayKind === "today";
  const markerIndex = showNow ? blocks.findIndex((block) => block.startMinute > nowMinute) : -2;

  const openId =
    choice === "none"
      ? null
      : choice !== null && blocks.some((block) => block.instance.id === choice)
        ? choice
        : focusId;

  return (
    <ol className="flex flex-col">
      {blocks.map((block, index) => {
        const open = block.instance.id === openId;
        const category = categoryById.get(block.instance.categoryId);
        return (
          <li key={block.instance.id} className="flex flex-col">
            {index === markerIndex ? <NowMarker nowMinute={nowMinute} /> : null}
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)]">
              <span
                className={cn(
                  "pt-3 text-right text-meta tabular-nums",
                  block.instance.status === "done" ? "text-ink-muted" : "text-ink",
                  block.overlap && "text-warn",
                )}
              >
                {formatClockValue(block.startMinute)}
              </span>

              <div className="relative min-w-0 border-l border-line pb-2 pl-4 pt-3">
                <RowSweep status={block.instance.status} />
                <TimelineDot status={block.instance.status} />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Markers status={block.instance.status} overlap={block.overlap} />
                  </div>

                  {open ? (
                    <BlockCard
                      instance={block.instance}
                      category={category}
                      isFocus={block.instance.id === focusId}
                      dayKind={dayKind}
                      nowMinute={nowMinute}
                      startLabel={t("today.blockTime", {
                        start: formatClockValue(block.startMinute),
                        end: formatClockValue(block.endMinute),
                      })}
                      onCollapse={() => setChoice("none")}
                      onOpenNote={onOpenNote}
                      onEditBlock={onEditBlock}
                    />
                  ) : (
                    <CompactRow
                      instance={block.instance}
                      category={category}
                      dayKind={dayKind}
                      nowMinute={nowMinute}
                      onOpen={() => setChoice(block.instance.id)}
                      onQuickNote={onQuickNote}
                      onEditBlock={onEditBlock}
                    />
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
      {showNow && markerIndex === -1 ? (
        <li>
          <NowMarker nowMinute={nowMinute} />
        </li>
      ) : null}
    </ol>
  );
}

export function NoteSheet({
  instance,
  onClose,
}: {
  instance: BlockInstance;
  onClose: () => void;
}) {
  const setNote = useAppStore((state) => state.setNote);
  const flushNotes = useAppStore((state) => state.flushNotes);
  const pending = useAppStore((state) => state.notesPending[instance.id] === true);
  const stored = useAppStore((state) =>
    state.instances.find((candidate) => candidate.id === instance.id),
  );
  const current = stored ?? instance;
  const [value, setValue] = useState(current.note);
  const { t, formatClockValue } = useI18n();

  const [saving, setSaving] = useState(false);

  /**
   * Save, then leave. Autosave keeps working, but the button has to give a
   * clear answer: waiting for the write, closing the sheet and confirming with
   * a toast. A sheet that stayed open after "Save" left people unsure whether
   * anything had happened. If the write fails the sheet stays open, so the
   * text is never closed away unsaved.
   */
  function saveNow() {
    if (saving) return;
    setSaving(true);
    void flushNotes().then((ok) => {
      setSaving(false);
      if (!ok) return;
      toastManager.add({ title: t("today.noteSavedToast"), timeout: 3_000 });
      onClose();
    });
  }

  /**
   * Closing saves too. The toast is only honest when a write was actually
   * waiting: a sheet closed after the debounce has nothing left to confirm.
   */
  function requestClose() {
    const wasPending = pending;
    void flushNotes().then((ok) => {
      if (wasPending && ok) {
        toastManager.add({ title: t("today.noteSavedToast"), timeout: 3_000 });
      }
    });
    onClose();
  }

  // The last moment the text itself changed. Shown only after the write has
  // landed, so the clock never claims a save that has not happened.
  const savedAt = current.noteUpdatedAt ? Date.parse(current.noteUpdatedAt) : null;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      title={t("today.note")}
      description={current.title}
      footer={
        <>
          <Button variant="ghost" onClick={requestClose}>
            {t("common.close")}
          </Button>
          <Button onClick={saveNow} disabled={saving}>
            <IconCheck />
            {t("today.noteSaveClose")}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-label font-medium text-ink-muted">{t("today.note")}</span>
        <textarea
          value={value}
          rows={6}
          maxLength={20_000}
          placeholder={t("today.notePlaceholder")}
          onChange={(event) => {
            setValue(event.target.value);
            setNote(instance.id, event.target.value);
          }}
          onKeyDown={(event) => {
            // Ctrl/Cmd + Enter, wherever the cursor is in the field.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              saveNow();
            }
          }}
          className="min-h-32 w-full resize-y rounded-control border border-line-strong bg-surface-raised px-3 py-2 text-body text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        />
        <span className="text-label text-ink-muted">{t("today.noteHint")}</span>
      </label>

      {/* Certainty, not autosave theatre. The write keeps happening on its own,
          but "did it save?" deserves a visible answer the moment it changes —
          announced, so it is an answer for screen readers too. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span role="status" className="text-label text-ink-muted">
          {pending
            ? t("today.noteUnsaved")
            : savedAt !== null
              ? t("today.noteSaved", { time: formatClockValue(minuteOfDayFromEpoch(savedAt)) })
              : ""}
        </span>
        <span className="text-caption text-mute">{t("today.noteShortcutHint")}</span>
      </div>

      {hasMarkup(value) ? (
        <div className="rounded-panel border border-line bg-surface p-3 text-body text-ink">
          {renderMarkdown(value)}
        </div>
      ) : null}
    </Sheet>
  );
}

export function AddBlockSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const categories = useAppStore((state) => state.categories);
  const addInstance = useAppStore((state) => state.addInstance);
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [duration, setDuration] = useState("45");
  const [fixed, setFixed] = useState(false);
  const [start, setStart] = useState("09:00");

  const parsedDuration = Number.parseInt(duration, 10);
  const disabled =
    title.trim() === "" || categoryId === "" || !Number.isFinite(parsedDuration) || parsedDuration < 1;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("today.addBlockTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              void addInstance({
                date,
                title,
                categoryId,
                durationMin: parsedDuration,
                plannedStart: fixed ? start : null,
              });
              onClose();
            }}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <TextInput
        label={t("settings.blockTitle")}
        value={title}
        maxLength={120}
        error={title.trim() === "" ? t("a11y.required") : undefined}
        onChange={(event) => setTitle(event.target.value)}
      />
      {/* The same picker the plan form uses, so a new category is one press
          away here too — the block form used to be the only place that offered
          it, and adding a block mid-day is exactly when a missing category
          shows up. `titleHint` offers the block's own title as the name. */}
      <CategoryPicker
        label={t("settings.blockCategory")}
        value={categoryId}
        titleHint={title}
        onChange={setCategoryId}
      />
      <NumberInput
        label={t("settings.blockDuration")}
        value={duration}
        min={1}
        max={1440}
        step={5}
        onChange={(event) => setDuration(event.target.value)}
      />

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-meta">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(event) => setFixed(event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          {t("settings.blockStartFixed")}
        </label>
        {fixed ? (
          <TimeInput
            label={t("settings.blockStart")}
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        ) : (
          <p className="text-label text-ink-muted">{t("settings.blockStartFlexible")}</p>
        )}
      </div>
    </Sheet>
  );
}
