"use client";

import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { NumberInput, SelectField, TextInput, TimeInput } from "@/components/ui/field";
import { IconCheck, IconNote, IconPlay, IconSkip, IconUndo, IconWarning } from "@/components/ui/icons";
import { CategoryTag, Panel, ProgressBar, StatusBadge } from "@/components/ui/surface";
import { useAppStore } from "@/data/store";
import { formatCountdown, progressRatio, remainingSeconds } from "@/domain";
import type { LaidOutBlock } from "@/domain/schedule";
import type { BlockInstance, Category } from "@/domain/types";
import { useI18n } from "@/i18n";
import { hasMarkup, renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

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

/** The line the whole screen is built around: the clock on the left, the plan on the right. */
function NowMarker({ nowMinute }: { nowMinute: number }) {
  const { t, formatClockValue } = useI18n();
  return (
    <div className="grid grid-cols-[3.25rem_1fr] items-center gap-3 py-1.5 sm:grid-cols-[4rem_1fr]">
      <span aria-hidden="true" className="text-right text-label font-medium text-accent">
        {formatClockValue(nowMinute)}
      </span>
      <span aria-hidden="true" className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-accent" />
        <span className="h-px flex-1 bg-accent" />
      </span>
      <span className="sr-only">{t("today.nowMarker", { time: formatClockValue(nowMinute) })}</span>
    </div>
  );
}

function BlockActions({ instance, prominent }: { instance: BlockInstance; prominent: boolean }) {
  const startBlock = useAppStore((state) => state.startBlock);
  const completeBlock = useAppStore((state) => state.completeBlock);
  const resetBlock = useAppStore((state) => state.resetBlock);
  const skipBlock = useAppStore((state) => state.skipBlock);
  const { t } = useI18n();

  return (
    <>
      {instance.status === "planned" ? (
        <Button size={prominent ? "md" : "sm"} onClick={() => void startBlock(instance.id)}>
          <IconPlay />
          {t("common.start")}
        </Button>
      ) : null}
      {instance.status === "running" ? (
        <Button size={prominent ? "md" : "sm"} onClick={() => void completeBlock(instance.id)}>
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

/**
 * Screen readers get the countdown on a slow cadence — every five minutes and
 * whenever the block starts or is completed — never once per second.
 */
function TimerAnnouncement({
  title,
  remainingSeconds: remaining,
}: {
  title: string;
  remainingSeconds: number;
}) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const lastBucket = useRef(-1);

  useEffect(() => {
    const bucket = Math.floor(remaining / 300);
    if (bucket === lastBucket.current) return;
    lastBucket.current = bucket;
    setMessage(t("timer.announce", { title, time: formatCountdown(remaining) }));
  }, [remaining, title, t]);

  return (
    <p aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}

function FocusCard({
  instance,
  category,
  nowEpoch,
  onOpenNote,
}: {
  instance: BlockInstance;
  category: Category | undefined;
  nowEpoch: number;
  onOpenNote: (instance: BlockInstance) => void;
}) {
  const { t, formatMinutes } = useI18n();
  const remaining = remainingSeconds(instance, nowEpoch);
  const ratio = progressRatio(instance, nowEpoch);
  const overrunning = instance.status === "running" && remaining === 0;

  return (
    <Panel className="flex flex-col gap-3 border-accent/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-label font-medium text-accent">{t("today.focusTitle")}</p>
          <h3 className="text-title">{instance.title}</h3>
        </div>
        <StatusBadge status={instance.status} />
      </div>

      {category ? (
        <CategoryTag name={category.name} icon={category.icon} pattern={category.linePattern} />
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-display font-semibold tabular-nums">
          {instance.status === "running"
            ? formatCountdown(remaining)
            : formatMinutes(instance.durationMin)}
        </span>
        <span className="text-meta text-ink-muted">
          {instance.status === "running"
            ? overrunning
              ? t("today.overtime")
              : t("today.remaining", { time: formatCountdown(remaining) })
            : t("common.minutesValue", { count: instance.durationMin })}
        </span>
      </div>

      {instance.status === "running" ? (
        <TimerAnnouncement title={instance.title} remainingSeconds={remaining} />
      ) : null}

      <ProgressBar
        value={instance.status === "running" ? ratio : 0}
        label={t("a11y.progress", { done: Math.round(ratio * 100), total: 100 })}
      />

      <div className="flex flex-wrap items-center gap-2">
        <BlockActions instance={instance} prominent />
        <Button size="md" variant="secondary" onClick={() => onOpenNote(instance)}>
          <IconNote />
          {t("today.note")}
        </Button>
      </div>
    </Panel>
  );
}

function CompactRow({
  instance,
  category,
  nowEpoch,
  onOpenNote,
}: {
  instance: BlockInstance;
  category: Category | undefined;
  nowEpoch: number;
  onOpenNote: (instance: BlockInstance) => void;
}) {
  const { t, formatMinutes } = useI18n();
  const running = instance.status === "running";

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
            <CategoryTag name={category.name} icon={category.icon} pattern={category.linePattern} />
          ) : null}
          <span className="text-label text-ink-muted">
            {running
              ? formatCountdown(remainingSeconds(instance, nowEpoch))
              : formatMinutes(instance.durationMin)}
          </span>
          {instance.note.trim() ? (
            <span className="text-label text-ink-muted">· {t("today.note")}</span>
          ) : null}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <BlockActions instance={instance} prominent={false} />
        <IconButton label={`${t("today.note")}: ${instance.title}`} onClick={() => onOpenNote(instance)}>
          <IconNote />
        </IconButton>
      </div>
    </div>
  );
}

export function Timeline({
  blocks,
  nowMinute,
  nowEpoch,
  focusId,
  categoryById,
  onOpenNote,
}: {
  blocks: LaidOutBlock[];
  nowMinute: number;
  nowEpoch: number;
  focusId: string | null;
  categoryById: CategoryLookup;
  onOpenNote: (instance: BlockInstance) => void;
}) {
  const { t, formatClockValue } = useI18n();
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
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[5px] top-[1.15rem] size-[9px] rounded-full border",
                    block.instance.status === "done" && "border-ok bg-ok",
                    block.instance.status === "running" && "border-accent bg-accent",
                    block.instance.status === "planned" && "border-line-strong bg-surface",
                  )}
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Markers status={block.instance.status} overlap={block.overlap} />
                    {prominent ? (
                      <span className="text-label font-medium text-accent">{t("today.focusTitle")}</span>
                    ) : null}
                  </div>

                  {prominent ? (
                    <FocusCard
                      instance={block.instance}
                      category={categoryById.get(block.instance.categoryId)}
                      nowEpoch={nowEpoch}
                      onOpenNote={onOpenNote}
                    />
                  ) : (
                    <CompactRow
                      instance={block.instance}
                      category={categoryById.get(block.instance.categoryId)}
                      nowEpoch={nowEpoch}
                      onOpenNote={onOpenNote}
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
  const stored = useAppStore((state) =>
    state.instances.find((candidate) => candidate.id === instance.id),
  );
  const current = stored ?? instance;
  const [value, setValue] = useState(current.note);
  const { t } = useI18n();

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("today.note")}
      description={current.title}
      footer={
        <Button onClick={onClose}>{t("common.close")}</Button>
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
          className="min-h-32 w-full resize-y rounded-control border border-line-strong bg-surface-raised px-3 py-2 text-body text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        />
        <span className="text-label text-ink-muted">{t("today.noteHint")}</span>
      </label>

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
