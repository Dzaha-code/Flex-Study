"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm";
import { TimeInput } from "@/components/ui/field";
import { IconBook, IconCompass, IconDownload, IconInfo, IconUpload } from "@/components/ui/icons";
import { Chip, Panel, PanelHeader, SegmentedControl, SwitchRow } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import { estimateUsage } from "@/data/repository";
import {
  countWorkspace,
  parseWorkspaceImport,
  suggestExportFileName,
  type ImportResult,
} from "@/data/workspace-io";
import Link from "next/link";
import type { ContentWidth, Locale, ThemePreference, WeekStart } from "@/domain/types";
import { startTour } from "@/features/tour/tour-store";
import { useI18n, type MessageKey } from "@/i18n";
import { downloadTextFile, readFileAsText } from "@/lib/download";
import { ensureNotificationPermission } from "@/lib/desktop";
import { pickLocalized, TEMPLATES } from "@/templates";
import { BlockListEditor, CategoriesEditor } from "./plan-editor";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

export function SettingsScreen() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const templates = useAppStore((state) => state.templates);
  const categories = useAppStore((state) => state.categories);
  const exportWorkspace = useAppStore((state) => state.exportWorkspace);
  const importWorkspace = useAppStore((state) => state.importWorkspace);
  const resetEverything = useAppStore((state) => state.resetEverything);
  const applyTemplate = useAppStore((state) => state.applyTemplate);

  const { t, locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<
    { json: string; preview: Extract<ImportResult, { ok: true }> } | null
  >(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    void estimateUsage().then(setStorage);
  }, []);

  /** Validate first, then show what the file holds before replacing anything. */
  async function handleImportFile(file: File) {
    const json = await readFileAsText(file);
    const parsed = parseWorkspaceImport(json);
    if (!parsed.ok) {
      setImportErrors(parsed.errors);
      return;
    }
    setImportErrors(null);
    setPendingImport({ json, preview: parsed });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-display">{t("settings.title")}</h1>

      <Panel data-tour="settings-appearance">
        <PanelHeader title={t("settings.appearance")} />
        <div className="flex flex-col gap-5">
          <SegmentedControl
            legend={t("settings.language")}
            name="locale"
            value={settings.locale}
            onChange={(next) => void updateSettings({ locale: next as Locale })}
            options={[
              { value: "id", label: "Indonesia" },
              { value: "en", label: "English" },
            ]}
          />

          <SegmentedControl
            legend={t("settings.theme")}
            name="theme"
            value={settings.theme}
            onChange={(next) => void updateSettings({ theme: next as ThemePreference })}
            options={[
              { value: "system", label: t("settings.theme.system") },
              { value: "light", label: t("settings.theme.light") },
              { value: "dark", label: t("settings.theme.dark") },
            ]}
          />

          <div className="flex flex-col gap-1.5">
            <SegmentedControl
              legend={t("layout.width")}
              name="content-width"
              value={settings.contentWidth}
              onChange={(next) => void updateSettings({ contentWidth: next as ContentWidth })}
              options={[
                { value: "comfortable", label: t("layout.width.comfortable") },
                { value: "wide", label: t("layout.width.wide") },
                { value: "full", label: t("layout.width.full") },
              ]}
            />
            <p className="measure text-caption text-mute">{t("layout.widthHint")}</p>
          </div>

          <SegmentedControl
            legend={t("settings.weekStart")}
            name="week-start"
            value={String(settings.weekStart)}
            onChange={(next) => void updateSettings({ weekStart: Number(next) as WeekStart })}
            options={[
              { value: "1", label: t("settings.weekStart.monday") },
              { value: "0", label: t("settings.weekStart.sunday") },
            ]}
          />

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-label font-medium text-ink-muted">{t("settings.dayWindow")}</p>
              <p className="text-label text-ink-muted">{t("settings.dayWindowHint")}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <TimeInput
                label={t("settings.dayStart")}
                value={settings.dayStart}
                onChange={(event) =>
                  event.target.value ? void updateSettings({ dayStart: event.target.value }) : undefined
                }
              />
              <TimeInput
                label={t("settings.dayEnd")}
                value={settings.dayEnd}
                onChange={(event) =>
                  event.target.value ? void updateSettings({ dayEnd: event.target.value }) : undefined
                }
              />
            </div>
          </div>

          <SwitchRow
            label={t("settings.reminders")}
            hint={t("settings.remindersHint")}
            checked={settings.remindersEnabled}
            onChange={(next) => {
              // Ask for the permission at the moment the user opts in, never on
              // first load. The request goes through the desktop abstraction so
              // the Tauri shell asks its own notification plugin.
              if (next) void ensureNotificationPermission();
              void updateSettings({ remindersEnabled: next });
            }}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={t("settings.help")} description={t("settings.helpHint")} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={startTour}>
            <IconCompass />
            {t("guide.startTour")}
          </Button>
          <Link
            href="/guide"
            className="inline-flex h-11 items-center gap-2 rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
          >
            <IconBook />
            {t("nav.guide")}
          </Link>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={t("settings.categories")} />
        <CategoriesEditor />
      </Panel>

      <Panel>
        <PanelHeader title={t("settings.blocks")} description={t("settings.blocksHint")} />
        <BlockListEditor />
      </Panel>

      <Panel>
        <PanelHeader title={t("settings.templates")} description={t("settings.templatesHint")} />
        <ul className="flex flex-col divide-y divide-line">
          {TEMPLATES.map((template) => {
            const applied = settings.activeTemplateId === template.templateId;
            return (
              <li key={template.templateId} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-body font-medium">
                      {pickLocalized(template.name, locale)}
                    </span>
                    <span className="text-meta text-ink-muted measure">
                      {pickLocalized(template.description, locale)}
                    </span>
                    <span className="text-label text-ink-muted">
                      {t(template.audienceKey as MessageKey)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {applied ? <Chip>{t("settings.applyTemplate")} ✓</Chip> : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={applied}
                      onClick={() => setPendingTemplate(template.templateId)}
                    >
                      {t("settings.applyTemplate")}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel data-tour="settings-data">
        <PanelHeader title={t("settings.data")} description={t("settings.dataHint")} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const now = Date.now();
              downloadTextFile(suggestExportFileName(now), exportWorkspace());
              toastManager.add({ title: t("settings.exported"), timeout: 4_000 });
            }}
          >
            <IconDownload />
            {t("settings.export")}
          </Button>

          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <IconUpload />
            {t("settings.import")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleImportFile(file);
            }}
          />

          <Button variant="danger" onClick={() => setResetOpen(true)}>
            {t("settings.reset")}
          </Button>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-label text-ink-muted">
          <IconInfo width={14} height={14} className="mt-0.5 shrink-0" />
          <span>
            {t("settings.count.categories", { count: categories.length })} ·{" "}
            {t("settings.count.blocks", { count: templates.length })}
            {storage ? ` · ${formatBytes(storage.usage)}` : null}
          </span>
        </p>
      </Panel>

      <ConfirmSheet
        open={importErrors !== null}
        onOpenChange={(next) => {
          if (!next) setImportErrors(null);
        }}
        title={t("settings.import")}
        description={importErrors ? importErrors.join(" · ") : ""}
        confirmLabel={t("common.close")}
        onConfirm={() => setImportErrors(null)}
      />

      <ConfirmSheet
        open={pendingImport !== null}
        onOpenChange={(next) => {
          if (!next) setPendingImport(null);
        }}
        title={t("settings.importConfirm")}
        description={
          pendingImport
            ? t("settings.importPreview", {
                ...countWorkspace(pendingImport.preview.workspace),
              })
            : ""
        }
        confirmLabel={t("settings.import")}
        onConfirm={() => {
          const payload = pendingImport;
          setPendingImport(null);
          if (!payload) return;
          void importWorkspace(payload.json).then((result) => {
            toastManager.add({
              title: result.ok ? t("settings.imported") : t("error.unknown"),
              timeout: 5_000,
            });
          });
        }}
      />

      <ConfirmSheet
        open={pendingTemplate !== null}
        onOpenChange={(next) => {
          if (!next) setPendingTemplate(null);
        }}
        title={t("settings.applyTemplate")}
        description={t("settings.applyTemplateWarning")}
        confirmLabel={t("settings.applyTemplate")}
        onConfirm={() => {
          if (pendingTemplate) void applyTemplate(pendingTemplate);
        }}
      />

      <ConfirmSheet
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t("settings.reset")}
        description={t("settings.resetConfirm")}
        confirmLabel={t("settings.reset")}
        tone="danger"
        onConfirm={() => {
          void resetEverything().then(() => {
            toastManager.add({ title: t("settings.resetDone"), timeout: 4_000 });
          });
        }}
      />
    </div>
  );
}
