"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextInput } from "@/components/ui/field";
import { CATEGORY_GLYPH_IDS, CategoryGlyph, IconPlus } from "@/components/ui/icons";
import { useAppStore } from "@/data/store";
import type { CategorySymbol } from "@/domain/types";
import { StabiloAside } from "@/features/stabilo/ui/StabiloAside";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Category select with an escape hatch.
 *
 * The block form used to offer only the categories that already existed, so a
 * user whose plan did not fit them had to abandon the block, go to Settings,
 * create a category, and start again. Creating one is now part of the same
 * form: it is saved immediately, and it becomes the selected value so the block
 * can be finished without leaving.
 */
export function CategoryPicker({
  label,
  value,
  onChange,
  error,
  titleHint,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  error?: string;
  /** The block's title, offered as a shortcut when naming the category. */
  titleHint?: string;
}) {
  const categories = useAppStore((state) => state.categories);
  const saveCategory = useAppStore((state) => state.saveCategory);
  const { t } = useI18n();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategorySymbol>("star");
  const [busy, setBusy] = useState(false);

  const clean = name.trim();
  const suggestion = titleHint?.trim().slice(0, 80) ?? "";

  async function create() {
    if (clean === "" || busy) return;
    setBusy(true);
    try {
      const id = await saveCategory({
        name: clean,
        icon,
        weeklyTargetMinutes: 300,
      });
      onChange(id);
      setCreating(false);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <SelectField
            label={label}
            value={value}
            error={error}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={creating}
          onClick={() => setCreating((open) => !open)}
        >
          <IconPlus size={16} />
          {t("settings.newCategory")}
        </Button>
      </div>

      {creating ? (
        <div className="flex flex-col gap-3 rounded-panel border border-line bg-raised p-3">
          <StabiloAside
            text={t("stabilo.categoryTip")}
            action={
              suggestion
                ? {
                    label: t("stabilo.categoryTipAction"),
                    onClick: () => setName(suggestion),
                    disabled: clean === suggestion,
                  }
                : undefined
            }
          />

          <TextInput
            label={t("settings.categoryName")}
            value={name}
            maxLength={80}
            autoFocus
            placeholder={t("settings.categoryNamePlaceholder")}
            onChange={(event) => setName(event.target.value)}
          />

          <fieldset className="flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 text-label font-medium text-ink-muted">
              {t("settings.categoryIcon")}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_GLYPH_IDS.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  aria-pressed={icon === symbol}
                  aria-label={symbol}
                  onClick={() => setIcon(symbol)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-control border text-body",
                    icon === symbol
                      ? "border-accent bg-accent-surface text-ink"
                      : "border-line-strong text-ink-muted hover:bg-accent-surface/50",
                  )}
                >
                  <CategoryGlyph icon={symbol} className="text-body" />
                </button>
              ))}
            </div>
          </fieldset>

          <p className="text-label text-ink-muted">{t("settings.categoryTargetHint")}</p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={clean === "" || busy} onClick={() => void create()}>
              {t("settings.categoryCreate")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setName("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
