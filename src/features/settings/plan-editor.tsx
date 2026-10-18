"use client";

import { useState } from "react";
import { ConfirmSheet } from "@/components/ui/confirm";
import { Sheet } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/ui/button";
import { NumberInput, SelectField, TextInput } from "@/components/ui/field";
import {
  CATEGORY_GLYPH_IDS,
  CategoryGlyph,
  SYMBOL_GLYPHS,
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import { CategoryTag, EmptyState } from "@/components/ui/surface";
import { BlockTemplateForm } from "@/features/plan/block-template-form";
import { useAppStore, type BlockTemplateDraft, type CategoryDraft } from "@/data/store";
import type { BlockTemplate, Category, CategorySymbol } from "@/domain/types";
import { useI18n } from "@/i18n";

/** The picker shows the marker itself — a symbol needs no translated name. */
const CATEGORY_SYMBOL_OPTIONS = CATEGORY_GLYPH_IDS.map((symbol) => ({
  value: symbol,
  label: SYMBOL_GLYPHS[symbol],
}));


/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

function CategoryForm({ initial, onClose }: { initial: CategoryDraft; onClose: () => void }) {
  const saveCategory = useAppStore((state) => state.saveCategory);
  const { t } = useI18n();

  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState<CategorySymbol>(initial.icon);
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
        options={CATEGORY_SYMBOL_OPTIONS}
        onChange={(event) => setIcon(event.target.value as CategorySymbol)}
      />

      <div className="flex items-center gap-3 rounded-panel border border-line bg-raised p-3">
        <CategoryGlyph icon={icon} className="text-body text-ink" />
        <span className="text-caption text-mute">{name || "—"}</span>
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
                setDraft({ name: "", icon: "star", weeklyTargetMinutes: 300 })
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
                icon: "star",
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
        {/* Never disabled on an empty category list: the form can create the
            first category itself, which is faster than sending the user to the
            panel above and back. */}
        <Button variant="secondary" onClick={() => setDraft(blankDraft())}>
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
