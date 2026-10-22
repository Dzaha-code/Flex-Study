"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { NumberInput, SelectField, TextInput, TimeInput } from "@/components/ui/field";
import {
  IconCheck,
  IconNote,
  IconPencil,
  IconPlay,
  IconSkip,
  IconUndo,
  IconWarning,
} from "@/components/ui/icons";
import { CategoryTag, StatusBadge } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import type { LaidOutBlock } from "@/domain/schedule";
import { minuteOfDayFromEpoch } from "@/domain/time";
import type { BlockInstance, Category } from "@/domain/types";
import { useI18n } from "@/i18n";
import { useJustChanged } from "@/lib/ink";
import { hasMarkup, renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
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
        status === "planned" && "border-line-strong bg-surface",
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

function BlockActions({ instance, prominent }: { instance: BlockInstance; prominent: boolean }) {
  const startBlock = useAppStore((state) => state.startBlock);
  const completeBlock = useAppStore((state) => state.completeBlock);
  const resetBlock = useAppStore((state) => state.resetBlock);
  const skipBlock = useAppStore((state) => state.skipBlock);
  const { t } = useI18n();
  // Counts the taps instead of a boolean, so a fresh ripple element is mounted
  // per press and the animation replays without any cleanup state.
  const [ripple, setRipple] = useState(0);

  return (
    <>
      {instance.status === "planned" ? (
        // The wrapper is only here to anchor the ripple; it is sized by the
        // button inside it, so it changes nothing about the row's layout.
        <span className="relative inline-flex">
          <Button
            size={prominent ? "md" : "sm"}
            // Only the active block carries the one primary button on the screen
            // (DESIGN.md §2 "satu sorotan per layar", §5). Rows use the text
            // variant, matching the reference prototype.
            variant={prominent ? "primary" : "ghost"}
            // This button already owns the one lime spread of the screen
            // (focus-ripple below) — Riak must not answer the same press twice.
            data-ink-ripple={prominent ? "off" : undefined}
            onClick={() => {
              setRipple((count) => count + 1);
              void startBlock(instance.id);
            }}
          >
            <IconPlay />
            {prominent ? t("common.start") : t("common.startShort")}
          </Button>
          {/* The lime stays on the one primary button per screen, so the spread
              is deliberately not repeated on the compact rows. */}
          {prominent && ripple > 0 ? (
            <span key={ripple} className="focus-ripple rounded-control" aria-hidden="true" />
          ) : null}
        </span>
      ) : null}
      {instance.status === "running" ? (
        <Button
          size={prominent ? "md" : "sm"}
          variant={prominent ? "primary" : "ghost"}
          onClick={() => void completeBlock(instance.id)}
        >
          <IconCheck />
          {t("common.finish")}
        </Button>
      ) : null}
      {instance.status === "done" ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void resetBlock(instance.id)}
        >
          <IconUndo />
          {t("common.reset")}
        </Button>
      ) : null}
      {prominent && instance.status !== "done" ? (
        <Button size="sm" variant="ghost" onClick={() => void skipBlock(instance.id)}>
          <IconSkip />
          {t("common.skip")}
        </Button>
      ) : null}
    </>
  );
}

function FocusCard({
  instance,
  category,
  onOpenNote,
  onEditBlock,
}: {
  instance: BlockInstance;
  category: Category | undefined;
  onOpenNote: (instance: BlockInstance) => void;
  onEditBlock: (instance: BlockInstance) => void;
}) {
  const { t } = useI18n();

  return (
    // The active block is the strongest line on the page: 1.5px of ink, the
    // one highlight per screen (DESIGN.md §5).
    <div className="surface-active flex flex-col gap-3 p-5" data-tour="focus">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p>
            <span className="stabilo">{t("today.focusTitle")}</span>
          </p>
          <h3 className="text-title-2">{instance.title}</h3>
        </div>
        <StatusBadge status={instance.status} />
      </div>

      {category ? (
        <CategoryTag name={category.name} icon={category.icon} />
      ) : null}

      {/* Countdown, remaining label and rule tick together inside FocusTimer,
          which owns the only one-second clock on this screen (ToApk.md §7). */}
      <FocusTimer instance={instance} />

      <div className="flex flex-wrap items-center gap-2">
        <BlockActions instance={instance} prominent />
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
  onQuickNote,
  onEditBlock,
}: {
  instance: BlockInstance;
  category: Category | undefined;
  /**
   * The row icon: reading first. A row that already carries a note opens it;
   * one that does not still opens the editor, so writing is never a tap away.
   */
  onQuickNote: (instance: BlockInstance) => void;
  onEditBlock: (instance: BlockInstance) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "truncate text-body",
            instance.status === "done" && "text-ink-muted",
          )}
        >
          {instance.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {category ? (
            <CategoryTag name={category.name} icon={category.icon} />
          ) : null}
          <Countdown instance={instance} />
          {instance.note.trim() ? (
            <span className="text-label text-ink-muted">· {t("today.note")}</span>
          ) : null}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <BlockActions instance={instance} prominent={false} />
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

export function Timeline({
  blocks,
  nowMinute,
  focusId,
  categoryById,
  onOpenNote,
  onQuickNote,
  onEditBlock,
}: {
  blocks: LaidOutBlock[];
  nowMinute: number;
  focusId: string | null;
  categoryById: CategoryLookup;
  /** The focus card's button: writing, straight into the editor. */
  onOpenNote: (instance: BlockInstance) => void;
  /** A compact row's icon: reading a note that exists, writing one that does not. */
  onQuickNote: (instance: BlockInstance) => void;
  onEditBlock: (instance: BlockInstance) => void;
}) {
  const { formatClockValue } = useI18n();
  const markerIndex = blocks.findIndex((block) => block.startMinute > nowMinute);

  return (
    <ol className="flex flex-col">
      {blocks.map((block, index) => {
        const prominent = block.instance.id === focusId;
        return (
          <li key={block.instance.id} className="flex flex-col">
            {index === markerIndex ? <NowMarker nowMinute={nowMinute} /> : null}
            <div className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4rem_1fr]">
              <span
                className={cn(
                  "pt-3 text-right text-meta tabular-nums",
                  block.instance.status === "done" ? "text-ink-muted" : "text-ink",
                  block.overlap && "text-warn",
                )}
              >
                {formatClockValue(block.startMinute)}
              </span>

              <div className="relative border-l border-line pb-2 pl-4 pt-3">
                <RowSweep status={block.instance.status} />
                <TimelineDot status={block.instance.status} />
                <div className="flex flex-col gap-1">
                  {/* The "in focus" label lives inside FocusCard, which owns
                      the one highlight for this part of the screen. */}
                  <div className="flex items-center gap-2">
                    <Markers status={block.instance.status} overlap={block.overlap} />
                  </div>

                  {prominent ? (
                    <FocusCard
                      instance={block.instance}
                      category={categoryById.get(block.instance.categoryId)}
                      onOpenNote={onOpenNote}
                      onEditBlock={onEditBlock}
                    />
                  ) : (
                    <CompactRow
                      instance={block.instance}
                      category={categoryById.get(block.instance.categoryId)}
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
      {markerIndex === -1 ? (
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

  /**
   * Save now instead of waiting out the debounce. Autosave keeps working — the
   * button is not the only way anything is written — it exists so that "did it
   * save?" has an action and an answer attached to it.
   */
  function saveNow() {
    void flushNotes();
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
        <Button onClick={requestClose}>{t("common.close")}</Button>
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
        <div className="flex items-center gap-2">
          <span className="text-caption text-mute">{t("today.noteShortcutHint")}</span>
          <Button size="sm" variant="secondary" onClick={saveNow}>
            {t("today.noteSave")}
          </Button>
        </div>
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
      <SelectField
        label={t("settings.blockCategory")}
        value={categoryId}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        onChange={(event) => setCategoryId(event.target.value)}
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
