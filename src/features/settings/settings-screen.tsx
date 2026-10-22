"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm";
import { TextInput, TimeInput } from "@/components/ui/field";
import {
  IconBook,
  IconCompass,
  IconDownload,
  IconInfo,
  IconPlay,
  IconUpload,
} from "@/components/ui/icons";
import { Chip, Panel, PanelHeader, SegmentedControl, SwitchRow } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import { estimateUsage } from "@/data/repository";
import { CustomTemplates } from "./custom-templates";
import { TemplateSwitchSheet, useTemplateSwitchFeedback } from "./template-switch-sheet";
import {
  countWorkspace,
  parseWorkspaceImport,
  suggestExportFileName,
  type ImportResult,
} from "@/data/workspace-io";
import Link from "next/link";
import type {
  AnimationPreference,
  ContentWidth,
  IntroPreference,
  ISODate,
  Locale,
  StabiloIntensity,
  ThemePreference,
  WeekStart,
} from "@/domain/types";
import { INTRO_FORCE_KEY, INTRO_SEEN_KEY } from "@/features/intro/intro-mode";
import { introDebugEnabled, setIntroDebug } from "@/features/intro/intro-log";
import { STABILO_FULL_HORROR } from "@/features/stabilo/flags";
import { offeredIntensities, type StabiloPrefs } from "@/features/stabilo/prefs";
import { showClassicTour, showStabilo } from "@/features/guide/guide-coordinator";
import { useI18n, type MessageKey } from "@/i18n";
import { downloadTextFile, readFileAsText } from "@/lib/download";
import { useReducedMotion } from "@/lib/motion";
import { useWindowMaximised } from "@/lib/viewport";
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
  const customTemplates = useAppStore((state) => state.customTemplates);
  const exportWorkspace = useAppStore((state) => state.exportWorkspace);
  const importWorkspace = useAppStore((state) => state.importWorkspace);
  const resetEverything = useAppStore((state) => state.resetEverything);
  const applyTemplate = useAppStore((state) => state.applyTemplate);
  const stabilo = useAppStore((state) => state.stabilo);
  const updateStabilo = useAppStore((state) => state.updateStabilo);

  const { t, locale } = useI18n();
  const raiseSwitchToast = useTemplateSwitchFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /**
   * Live, because the answer explains why she may be standing still: this is
   * the system's preference, not a broken build. On a machine where animation
   * effects were switched off (or a "best performance" profile is on), it
   * reads `true` without the user ever having asked for it.
   */
  const reducesMotion = useReducedMotion();
  const maximised = useWindowMaximised();
  const [introDebug, setIntroDebugState] = useState(introDebugEnabled);

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

  /**
   * INTRO-ANIMATION.md §9: ask for one play, then reload so the gate re-reads
   * it. A reload is the honest way to do this — the decision is taken once,
   * before the database answers, so the animation cannot be replayed in place.
   *
   * A request flag rather than clearing the seen flag, so the button still works
   * when the preference is `off`; the gate spends it when the animation ends.
   */
  function replayIntro() {
    try {
      localStorage.setItem(INTRO_FORCE_KEY, "1");
    } catch {
      /* Storage blocked: the reload is still harmless. */
    }
    window.location.reload();
  }

  /**
   * Forgets that the intro was seen, without touching a single block: a tester
   * should never have to reset the whole app to watch the opening again.
   */
  function resetIntro() {
    try {
      localStorage.removeItem(INTRO_SEEN_KEY);
      localStorage.removeItem(INTRO_FORCE_KEY);
    } catch {
      /* Storage blocked: there is nothing to forget. */
    }
    toastManager.add({ title: t("settings.resetIntroDone"), timeout: 3_000 });
  }

  /**
   * Every catalog application lands in the start-day sheet (§3.5): the id
   * lives in this screen's state, the sheet owns the when and the preview.
   */
  function confirmCatalogTemplate(startDate: ISODate) {
    const id = pendingTemplate;
    if (!id) return;
    void raiseSwitchToast(() => applyTemplate(id, { startDate }));
  }

  const pendingTemplateName = useMemo(() => {
    if (!pendingTemplate) return "";
    const catalog = TEMPLATES.find((entry) => entry.templateId === pendingTemplate);
    if (catalog) return pickLocalized(catalog.name, locale);
    return customTemplates.find((entry) => entry.id === pendingTemplate)?.name ?? "";
  }, [pendingTemplate, customTemplates, locale]);

  /** Which plan is in force right now, by whichever list it came from. */
  const activeTemplateName = useMemo(() => {
    const catalog = TEMPLATES.find(
      (entry) => entry.templateId === settings.activeTemplateId,
    );
    if (catalog) return pickLocalized(catalog.name, locale);
    return customTemplates.find((entry) => entry.id === settings.activeTemplateId)?.name ?? null;
  }, [settings.activeTemplateId, customTemplates, locale]);

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

          {/* Directly under the theme, because it is the same kind of choice:
              it decides what the app shows the moment it opens. */}
          <div className="flex flex-col gap-1.5">
            <SegmentedControl
              legend={t("settings.introMode")}
              name="intro-mode"
              value={settings.intro}
              onChange={(next) => void updateSettings({ intro: next as IntroPreference })}
              options={[
                { value: "once", label: t("settings.intro.once") },
                { value: "always", label: t("settings.intro.always") },
                { value: "off", label: t("settings.intro.off") },
              ]}
            />
            <p className="measure text-caption text-mute">{t("settings.introHint")}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={replayIntro}>
                <IconPlay size={16} />
                {t("settings.replayIntro")}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetIntro}>
                {t("settings.resetIntro")}
              </Button>
              <span className="text-label text-mute">{t("settings.replayIntroHint")}</span>
            </div>

            {/* The diagnosis switch. Off by default; it records what the next
                launch actually did, so an affected machine can report facts
                instead of "it stopped". */}
            <SwitchRow
              label={t("settings.introDebug")}
              hint={t("settings.introDebugHint")}
              checked={introDebug}
              onChange={(next) => {
                setIntroDebug(next);
                setIntroDebugState(next);
              }}
            />
          </div>

          {/* One motion control for the whole app. The intro, Stabilo, and every
              transition read the same answer, which is why this lives here and
              not as a switch in each feature's panel. */}
          <div className="flex flex-col gap-1.5">
            <SegmentedControl
              legend={t("settings.animation")}
              name="animation"
              value={settings.animation}
              onChange={(next) =>
                void updateSettings({ animation: next as AnimationPreference })
              }
              options={[
                { value: "system", label: t("settings.animation.system") },
                { value: "full", label: t("settings.animation.full") },
                { value: "reduced", label: t("settings.animation.reduced") },
              ]}
            />
            <p className="measure text-caption text-mute">{t("settings.animationHint")}</p>
            {reducesMotion ? (
              <p className="measure text-caption text-mute">{t("settings.animationSystemReduce")}</p>
            ) : null}
          </div>

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
            {/* Said only when it is actually happening, so the control never
                contradicts what is on screen. */}
            {maximised ? (
              <p className="measure text-caption text-mute">{t("layout.widthMaximised")}</p>
            ) : null}
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

      <Panel data-tour="settings-stabilo">
        <PanelHeader title={t("settings.stabilo")} description={t("settings.stabilo.hint")} />
        <div className="flex flex-col gap-4">
          {/* 3.4: say plainly what she is now, so nobody waits for a companion
              that only exists in the roadmap. */}
          <p className="measure text-caption text-ink-muted">{t("settings.stabilo.role")}</p>
          <SwitchRow
            label={t("settings.stabilo.enabled")}
            hint={t("settings.stabilo.enabledHint")}
            checked={stabilo.enabled}
            onChange={(next) => void updateStabilo({ enabled: next })}
          />

          <SegmentedControl
            legend={t("settings.stabilo.intensity")}
            name="stabilo-intensity"
            value={stabilo.intensity}
            onChange={(next) => void updateStabilo({ intensity: next as StabiloIntensity })}
            options={offeredIntensities(STABILO_FULL_HORROR).map((value) => ({
              value,
              label: t(`settings.stabilo.intensity.${value}` as MessageKey),
            }))}
          />

          <SwitchRow
            label={t("settings.stabilo.fx")}
            hint={t("settings.stabilo.fxHint")}
            checked={stabilo.fx}
            onChange={(next) => void updateStabilo({ fx: next })}
          />

          {/* Motion is one decision, so it has one control: Tampilan → Animasi.
              This panel only explains what that means for her, and says when the
              system is the reason she is still — the question that started it. */}
          <div className="flex flex-col gap-1">
            <p className="text-label font-medium text-ink-muted">
              {t("settings.stabilo.motion")}
            </p>
            <p className="measure text-caption text-ink-muted">
              {reducesMotion
                ? t("settings.stabilo.motionBlocked")
                : t("settings.stabilo.motionHint")}
            </p>
          </div>

          <SegmentedControl
            legend={t("settings.stabilo.sound")}
            name="stabilo-sound"
            value={stabilo.sound}
            onChange={(next) => void updateStabilo({ sound: next as StabiloPrefs["sound"] })}
            options={(["off", "soft", "normal"] as const).map((value) => ({
              value,
              label: t(`settings.stabilo.sound.${value}` as MessageKey),
            }))}
          />

          <TextInput
            label={t("settings.stabilo.nickname")}
            hint={t("settings.stabilo.nicknameHint")}
            value={stabilo.nickname}
            onChange={(event) => void updateStabilo({ nickname: event.target.value })}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!stabilo.enabled}
              onClick={() => showStabilo("intro")}
            >
              <IconPlay size={16} />
              {t("settings.stabilo.replayIntro")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!stabilo.enabled}
              onClick={() => showStabilo("tour")}
            >
              <IconCompass size={16} />
              {t("settings.stabilo.replayTour")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void updateStabilo({
                  introSeen: false,
                  tourDone: false,
                  ph3Seen: 0,
                  progress: null,
                });
                toastManager.add({ title: t("settings.stabilo.resetDone"), timeout: 3_000 });
              }}
            >
              {t("settings.stabilo.reset")}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={t("settings.help")} description={t("settings.helpHint")} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              // Same tour content, different presenter. With Stabilo off the
              // classic one is the only option, and it never stopped existing.
              if (stabilo.enabled) showStabilo("tour");
              else showClassicTour();
            }}
          >
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

      {/* Its own target: the tour explains saved templates on this panel. */}
      <Panel data-tour="settings-templates">
        <PanelHeader title={t("settings.templates")} description={t("settings.templatesHint")} />
        {/* The answer to "which plan am I on?" before the list of candidates. */}
        {activeTemplateName ? (
          <p className="mb-3 text-meta text-ink">
            {t("settings.templates.activeLine", { name: activeTemplateName })}
          </p>
        ) : null}
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
                    {template.audienceKey ? (
                      <span className="text-label text-ink-muted">
                        {t(template.audienceKey as MessageKey)}
                      </span>
                    ) : null}
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
        <CustomTemplates />
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

      {/* §3.5: when it starts, what it changes, and how to take it back. */}
      <TemplateSwitchSheet
        open={pendingTemplate !== null}
        onOpenChange={(next) => {
          if (!next) setPendingTemplate(null);
        }}
        templateName={pendingTemplateName}
        onConfirm={confirmCatalogTemplate}
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
