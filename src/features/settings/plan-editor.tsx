"use client";

import { useState } from "react";
import { ConfirmSheet } from "@/components/ui/confirm";
import { Sheet } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/ui/button";
import { NumberInput, SelectField, TextInput, TimeInput } from "@/components/ui/field";
import {
  CATEGORY_ICON_IDS,
  CategoryGlyph,
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import {
  CategoryTag,
  EmptyState,
  PatternMark,
  SegmentedControl,
} from "@/components/ui/surface";
import { useAppStore, type BlockTemplateDraft, type CategoryDraft } from "@/data/store";
import type { BlockTemplate, Category, CategoryIcon, LinePattern } from "@/domain/types";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const PATTERNS: LinePattern[] = ["solid", "dashed", "dotted"];

const CATEGORY_ICON_LABEL_KEYS = CATEGORY_ICON_IDS.map((icon) => ({
  value: icon,
  labelKey: `settings.icon.${icon}` as const,
}));

const DAY_INDEXES = [1, 2, 3, 4, 5, 6, 0];

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

function CategoryForm({ initial, onClose }: { initial: CategoryDraft; onClose: () => void }) {
  const saveCategory = useAppStore((state) => state.saveCategory);
  const { t } = useI18n();

  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState<CategoryIcon>(initial.icon);
  const [pattern, setPattern] = useState<LinePattern>(initial.linePattern);
  const [target, setTarget] = useState(String(initial.weeklyTargetMinutes));

  const parsedTarget = Number.parseInt(target, 10);
  const nameMissing = name.trim() === "";
  const targetInvalid = !Number.isFinite(parsedTarget) || parsedTarget < 0;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={initial.id ? t("common.edit") : t("settings.newCategory")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={nameMissing || targetInvalid}
            onClick={() => {
              void saveCategory({
                id: initial.id,
                name,
                icon,
                linePattern: pattern,
                weeklyTargetMinutes: parsedTarget,
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
        label={t("settings.categoryName")}
        value={name}
        maxLength={80}
        error={nameMissing ? t("a11y.required") : undefined}
        onChange={(event) => setName(event.target.value)}
      />

      <SelectField
        label={t("settings.categoryIcon")}
        value={icon}
        options={CATEGORY_ICON_LABEL_KEYS.map((entry) => ({
          value: entry.value,
          label: t(entry.labelKey),
        }))}
        onChange={(event) => setIcon(event.target.value as CategoryIcon)}
      />

      <SegmentedControl
        legend={t("settings.categoryPattern")}
        name="category-pattern"
        value={pattern}
        onChange={setPattern}
        options={PATTERNS.map((value) => ({
          value,
          label: t(
            value === "solid"
              ? "settings.pattern.solid"
              : value === "dashed"
                ? "settings.pattern.dashed"
                : "settings.pattern.dotted",
          ),
        }))}
      />

      <div className="flex items-center gap-3 rounded-panel border border-line bg-surface p-3">
        <CategoryGlyph icon={icon} width={22} height={22} />
        <PatternMark pattern={pattern} className="text-ink-muted" />
        <span className="text-meta text-ink-muted">{name || "—"}</span>
      </div>

      <NumberInput
        label={t("settings.categoryTarget")}
        value={target}
        min={0}
        max={10080}
        step={15}
        error={targetInvalid ? t("a11y.required") : undefined}
        onChange={(event) => setTarget(event.target.value)}
      />
    </Sheet>
  );
}

export function CategoriesEditor() {
  const categories = useAppStore((state) => state.categories);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  const { t, formatMinutes } = useI18n();

  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  const ordered = [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3">
      {ordered.length === 0 ? (
        <EmptyState
          title={t("settings.newCategory")}
          body={t("settings.deleteCategoryHint")}
          action={
            <Button
              onClick={() =>
                setDraft({ name: "", icon: "sparkle", linePattern: "solid", weeklyTargetMinutes: 300 })
              }
            >
              <IconPlus />
              {t("settings.newCategory")}
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {ordered.map((category) => (
            <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <CategoryTag
                name={category.name}
                icon={category.icon}
                pattern={category.linePattern}
              />
              <div className="flex items-center gap-1">
                <span className="mr-1 text-meta text-ink-muted">
                  {formatMinutes(category.weeklyTargetMinutes)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: category.id,
                      name: category.name,
                      icon: category.icon,
                      linePattern: category.linePattern,
                      weeklyTargetMinutes: category.weeklyTargetMinutes,
                    })
                  }
                >
                  {t("common.edit")}
                </Button>
                <IconButton
                  label={`${t("common.delete")}: ${category.name}`}
                  onClick={() => setRemoving(category)}
                >
                  <IconTrash />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {ordered.length > 0 ? (
        <div>
          <Button
            variant="secondary"
            onClick={() =>
              setDraft({
                name: "",
                icon: "sparkle",
                linePattern: "solid",
                weeklyTargetMinutes: 300,
              })
            }
          >
            <IconPlus />
            {t("settings.newCategory")}
          </Button>
        </div>
      ) : null}

      {draft ? <CategoryForm initial={draft} onClose={() => setDraft(null)} /> : null}

      <ConfirmSheet
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title={`${t("common.delete")}: ${removing?.name ?? ""}`}
        description={t("settings.deleteCategoryHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        onConfirm={() => {
          if (removing) void deleteCategory(removing.id);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Block templates
 * ------------------------------------------------------------------ */

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

function BlockTemplateForm({
  initial,
  onClose,
}: {
  initial: BlockTemplateDraft;
  onClose: () => void;
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

export function BlockListEditor({ dense = false }: { dense?: boolean }) {
  const templates = useAppStore((state) => state.templates);
  const categories = useAppStore((state) => state.categories);
  const deleteBlockTemplate = useAppStore((state) => state.deleteBlockTemplate);
  const reorderBlockTemplate = useAppStore((state) => state.reorderBlockTemplate);
  const { t, formatMinutes, formatWeekdayIndex } = useI18n();

  const [draft, setDraft] = useState<BlockTemplateDraft | null>(null);
  const [removing, setRemoving] = useState<BlockTemplate | null>(null);

  const ordered = [...templates].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const blankDraft = (): BlockTemplateDraft => ({
    title: "",
    categoryId: categories[0]?.id ?? "",
    durationMin: 45,
    days: [1, 2, 3, 4, 5],
    plannedStart: null,
  });

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line">
        {ordered.map((template, index) => {
          const category = categoryById.get(template.categoryId);
          return (
            <li key={template.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-body font-medium">{template.title}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
                  {category ? (
                    <CategoryTag
                      name={category.name}
                      icon={category.icon}
                      pattern={category.linePattern}
                    />
                  ) : null}
                  <span>{formatMinutes(template.durationMin)}</span>
                  <span>
                    {template.days.length === 7
                      ? t("settings.blockDays")
                      : template.days.map((day) => formatWeekdayIndex(day)).join(" · ")}
                  </span>
                  <span>
                    {template.plannedStart ?? t("settings.blockStartFlexible")}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                {!dense ? (
                  <>
                    <IconButton
                      label={`${t("settings.moveUp")}: ${template.title}`}
                      disabled={index === 0}
                      onClick={() => void reorderBlockTemplate(template.id, -1)}
                    >
                      <IconArrowUp />
                    </IconButton>
                    <IconButton
                      label={`${t("settings.moveDown")}: ${template.title}`}
                      disabled={index === ordered.length - 1}
                      onClick={() => void reorderBlockTemplate(template.id, 1)}
                    >
                      <IconArrowDown />
                    </IconButton>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: template.id,
                      title: template.title,
                      categoryId: template.categoryId,
                      durationMin: template.durationMin,
                      days: template.days,
                      plannedStart: template.plannedStart,
                    })
                  }
                >
                  {t("common.edit")}
                </Button>
                <IconButton
                  label={`${t("common.delete")}: ${template.title}`}
                  onClick={() => setRemoving(template)}
                >
                  <IconTrash />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>

      {ordered.length === 0 ? (
        <p className="text-meta text-ink-muted">{t("settings.blocksHint")}</p>
      ) : null}

      <div>
        <Button
          variant="secondary"
          disabled={categories.length === 0}
          onClick={() => setDraft(blankDraft())}
        >
          <IconPlus />
          {t("settings.newBlock")}
        </Button>
      </div>

      {draft ? <BlockTemplateForm initial={draft} onClose={() => setDraft(null)} /> : null}

      <ConfirmSheet
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title={`${t("common.delete")}: ${removing?.title ?? ""}`}
        description={t("settings.blocksHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        onConfirm={() => {
          if (removing) void deleteBlockTemplate(removing.id);
        }}
      />
    </div>
  );
}
