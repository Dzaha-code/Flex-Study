"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm";
import { TextInput } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { Chip } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import { StabiloAside } from "@/features/stabilo/ui/StabiloAside";
import { useI18n } from "@/i18n";

/**
 * "Make a template" from the plan the user already built.
 *
 * A snapshot, not a live link: editing the blocks afterwards changes the plan,
 * not the saved copy. That is the only semantics that survives being applied
 * twice, and it is also the one people expect from a template.
 */
export function CustomTemplates() {
  const customTemplates = useAppStore((state) => state.customTemplates);
  const planSize = useAppStore(
    (state) => state.templates.filter((template) => !template.archived).length,
  );
  const saveCustomTemplate = useAppStore((state) => state.saveCustomTemplate);
  const deleteCustomTemplate = useAppStore((state) => state.deleteCustomTemplate);
  const applyCustomTemplate = useAppStore((state) => state.applyCustomTemplate);
  const { t } = useI18n();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [pendingApply, setPendingApply] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const id = await saveCustomTemplate({ name, description });
      if (!id) return;
      setCreating(false);
      setName("");
      setDescription("");
      toastManager.add({ title: t("settings.customTemplateSaved"), timeout: 3_000 });
    } finally {
      setBusy(false);
    }
  }

  async function apply(id: string) {
    setApplying(id);
    try {
      const ok = await applyCustomTemplate(id);
      if (ok) {
        toastManager.add({ title: t("settings.customTemplateApplied"), timeout: 3_000 });
      }
    } finally {
      setApplying(null);
    }
  }

  return (
    <div
      data-tour="settings-custom-templates"
      className="flex flex-col gap-3 border-t border-line pt-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-body font-medium">{t("settings.customTemplates")}</h3>
          <p className="text-label text-ink-muted measure">
            {t("settings.customTemplatesHint")}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          aria-expanded={creating}
          disabled={planSize === 0}
          onClick={() => setCreating((open) => !open)}
        >
          <IconPlus size={16} />
          {t("settings.customTemplateSave")}
        </Button>
      </div>

      {planSize === 0 ? (
        <p className="text-label text-ink-muted">{t("settings.customTemplateNeedsBlocks")}</p>
      ) : null}

      {creating ? (
        <div className="flex flex-col gap-3 rounded-panel border border-line bg-raised p-3">
          <StabiloAside text={t("stabilo.customTemplateTip")} />
          <TextInput
            label={t("settings.customTemplateName")}
            value={name}
            maxLength={80}
            autoFocus
            placeholder={t("settings.customTemplateNamePlaceholder")}
            onChange={(event) => setName(event.target.value)}
          />
          <TextInput
            label={t("settings.customTemplateDescription")}
            value={description}
            maxLength={240}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              {t("common.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {customTemplates.length === 0 ? (
        <p className="text-label text-ink-muted">{t("settings.customTemplateEmpty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {customTemplates.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-start justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-body font-medium">{template.name}</span>
                {template.description ? (
                  <span className="text-label text-ink-muted measure">
                    {template.description}
                  </span>
                ) : null}
                <Chip>
                  {t("settings.customTemplateBlocks", { count: template.blocks.length })}
                </Chip>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={applying === template.id}
                  onClick={() => setPendingApply(template.id)}
                >
                  {t("settings.applyTemplate")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRemoving(template.id)}>
                  {t("common.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Applying replaces the plan, so it asks first — the same warning the
          catalog templates show. */}
      <ConfirmSheet
        open={pendingApply !== null}
        onOpenChange={(next) => {
          if (!next) setPendingApply(null);
        }}
        title={t("settings.applyTemplate")}
        description={t("settings.applyTemplateWarning")}
        confirmLabel={t("settings.applyTemplate")}
        onConfirm={() => {
          const id = pendingApply;
          setPendingApply(null);
          if (id) void apply(id);
        }}
      />

      <ConfirmSheet
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title={t("settings.customTemplateDeleteTitle")}
        description={t("settings.customTemplateDeleteBody")}
        confirmLabel={t("common.delete")}
        tone="danger"
        onConfirm={() => {
          if (removing) {
            void deleteCustomTemplate(removing);
            toastManager.add({
              title: t("settings.customTemplateDeleted"),
              timeout: 3_000,
            });
          }
          setRemoving(null);
        }}
      />
    </div>
  );
}
