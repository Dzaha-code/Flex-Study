"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { NumberInput, TextInput, TimeInput } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/surface";
import { useAppStore } from "@/data/store";
import { resolveEditTarget } from "@/domain/propagate";
import type { BlockInstance } from "@/domain/types";
import { useI18n } from "@/i18n";
import { BlockTemplateForm } from "./block-template-form";
import { CategoryPicker } from "./category-picker";

/**
 * Editing a block straight from the timeline, so a typo can be fixed where it
 * is noticed instead of by going to Settings and hunting for the block.
 *
 * Which definition gets changed depends on where the block came from. A
 * generated block is edited at its template, so the correction reaches every
 * day it appears on; a block added by hand owns its own definition and is
 * edited on its own.
 */
export function EditBlockSheet({
  instance,
  onClose,
}: {
  instance: BlockInstance;
  onClose: () => void;
}) {
  const templates = useAppStore((state) => state.templates);
  const { t } = useI18n();

  const target = resolveEditTarget(instance, templates);

  if (target.kind === "template") {
    const { template } = target;
    return (
      <BlockTemplateForm
        initial={{
          id: template.id,
          title: template.title,
          categoryId: template.categoryId,
          durationMin: template.durationMin,
          days: template.days,
          plannedStart: template.plannedStart,
        }}
        onClose={onClose}
        hint={t("today.editHintTemplate")}
      />
    );
  }

  return <ManualBlockForm instance={target.instance} onClose={onClose} />;
}

/** A block with no template behind it: the occurrence is the definition. */
function ManualBlockForm({
  instance,
  onClose,
}: {
  instance: BlockInstance;
  onClose: () => void;
}) {
  const updateInstance = useAppStore((state) => state.updateInstance);
  const { t } = useI18n();

  const [title, setTitle] = useState(instance.title);
  const [categoryId, setCategoryId] = useState(instance.categoryId);
  const [duration, setDuration] = useState(String(instance.durationMin));
  const [fixedStart, setFixedStart] = useState(instance.plannedStart !== null);
  const [plannedStart, setPlannedStart] = useState(instance.plannedStart ?? "08:00");

  const parsedDuration = Number.parseInt(duration, 10);
  const titleMissing = title.trim() === "";
  const durationInvalid = !Number.isFinite(parsedDuration) || parsedDuration < 1;
  const disabled = titleMissing || durationInvalid || categoryId === "";

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("today.editBlock")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              void updateInstance(instance.id, {
                title,
                categoryId,
                durationMin: parsedDuration,
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
      <p className="measure text-caption text-mute">{t("today.editHintInstance")}</p>

      <TextInput
        label={t("settings.blockTitle")}
        value={title}
        maxLength={120}
        error={titleMissing ? t("a11y.required") : undefined}
        onChange={(event) => setTitle(event.target.value)}
      />

      <CategoryPicker
        label={t("settings.blockCategory")}
        value={categoryId}
        titleHint={title}
        error={categoryId === "" ? t("a11y.required") : undefined}
        onChange={setCategoryId}
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

      <SegmentedControl
        legend={t("settings.blockStart")}
        name={`instance-start-${instance.id}`}
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
