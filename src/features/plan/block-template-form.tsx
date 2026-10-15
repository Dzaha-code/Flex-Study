"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { NumberInput, SelectField, TextInput, TimeInput } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/surface";
import { useAppStore, type BlockTemplateDraft } from "@/data/store";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const DAY_INDEXES = [1, 2, 3, 4, 5, 6, 0];

/**
 * The block editor, shared by Settings and the Today timeline.
 *
 * Passing an `initial.id` edits that block; leaving it out creates a new one.
 */
function DayPicker({
  days,
  onChange,
}: {
  days: number[];
  onChange: (next: number[]) => void;
}) {
  const { t, formatWeekdayIndex } = useI18n();

  const toggle = (day: number) => {
    onChange(days.includes(day) ? days.filter((value) => value !== day) : [...days, day]);
  };

  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 text-label font-medium text-ink-muted">
        {t("settings.blockDays")}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {DAY_INDEXES.map((day) => {
          const active = days.includes(day);
          return (
            <label
              key={day}
              className={cn(
                "inline-flex min-h-10 min-w-14 cursor-pointer items-center justify-center rounded-control border px-2 text-meta",
                active
                  ? "border-accent bg-accent-surface text-ink"
                  : "border-line-strong text-ink-muted hover:bg-accent-surface/50",
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(day)}
                className="sr-only"
              />
              {formatWeekdayIndex(day)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BlockTemplateForm({
  initial,
  onClose,
  hint,
}: {
  initial: BlockTemplateDraft;
  onClose: () => void;
  /** Extra context for the caller's situation, e.g. editing from the timeline. */
  hint?: string;
}) {
  const categories = useAppStore((state) => state.categories);
  const saveBlockTemplate = useAppStore((state) => state.saveBlockTemplate);
  const { t } = useI18n();

  const [title, setTitle] = useState(initial.title);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [duration, setDuration] = useState(String(initial.durationMin));
  const [days, setDays] = useState<number[]>(initial.days);
  const [fixedStart, setFixedStart] = useState(initial.plannedStart !== null);
  const [plannedStart, setPlannedStart] = useState(initial.plannedStart ?? "08:00");

  const parsedDuration = Number.parseInt(duration, 10);
  const titleMissing = title.trim() === "";
  const durationInvalid = !Number.isFinite(parsedDuration) || parsedDuration < 1;
  const daysMissing = days.length === 0;
  const disabled = titleMissing || durationInvalid || daysMissing || categoryId === "";

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={initial.id ? t("common.edit") : t("settings.newBlock")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              void saveBlockTemplate({
                id: initial.id,
                title,
                categoryId,
                durationMin: parsedDuration,
                days,
                plannedStart: fixedStart ? plannedStart : null,
              });
              onClose();
            }}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      {hint ? <p className="measure text-caption text-mute">{hint}</p> : null}

      <TextInput
        label={t("settings.blockTitle")}
        value={title}
        maxLength={120}
        error={titleMissing ? t("a11y.required") : undefined}
        onChange={(event) => setTitle(event.target.value)}
      />

      <SelectField
        label={t("settings.blockCategory")}
        value={categoryId}
        error={categoryId === "" ? t("a11y.required") : undefined}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        onChange={(event) => setCategoryId(event.target.value)}
      />

      <NumberInput
        label={t("settings.blockDuration")}
        value={duration}
        min={1}
        max={1440}
        step={5}
        error={durationInvalid ? t("a11y.required") : undefined}
        onChange={(event) => setDuration(event.target.value)}
      />

      <DayPicker days={days} onChange={setDays} />
      {daysMissing ? <p className="text-label text-danger">{t("a11y.required")}</p> : null}

      <SegmentedControl
        legend={t("settings.blockStart")}
        name="block-start-mode"
        value={fixedStart ? "fixed" : "flexible"}
        onChange={(next) => setFixedStart(next === "fixed")}
        options={[
          { value: "flexible", label: t("settings.blockStartFlexible") },
          { value: "fixed", label: t("settings.blockStartFixed") },
        ]}
      />

      {fixedStart ? (
        <TimeInput
          label={t("settings.blockStart")}
          value={plannedStart}
          onChange={(event) => setPlannedStart(event.target.value)}
        />
      ) : null}
    </Sheet>
  );
}
