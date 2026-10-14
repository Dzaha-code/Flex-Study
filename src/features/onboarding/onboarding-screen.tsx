"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck, IconPlay } from "@/components/ui/icons";
import { Chip, Panel } from "@/components/ui/surface";
import { useAppStore } from "@/data/store";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { pickLocalized, TEMPLATES } from "@/templates";
import { BlockListEditor } from "@/features/settings/plan-editor";

const STEPS: MessageKey[] = ["onboarding.step1", "onboarding.step2", "onboarding.step3"];

/**
 * Onboarding without an account, and without a dead end: pick a template, adjust
 * anything, then land on Today with the first block already live.
 */
export function OnboardingScreen() {
  const { t, locale } = useI18n();
  const applyTemplate = useAppStore((state) => state.applyTemplate);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const blockTemplates = useAppStore((state) => state.templates);
  const categories = useAppStore((state) => state.categories);

  const [step, setStep] = useState(0);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-label font-medium text-accent">{t("app.name")}</p>
        <h1 className="text-display">{t("onboarding.title")}</h1>
        <p className="text-meta text-ink-muted measure">{t("onboarding.subtitle")}</p>
      </header>

      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((key, index) => (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-label",
                index === step
                  ? "border-accent bg-accent text-accent-ink"
                  : index < step
                    ? "border-ok text-ok"
                    : "border-line-strong text-ink-muted",
              )}
            >
              {index < step ? <IconCheck width={14} height={14} /> : index + 1}
            </span>
            <span
              className={cn(
                "text-label",
                index === step ? "font-medium text-ink" : "text-ink-muted",
              )}
            >
              {t(key)}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className="h-px w-6 bg-line" />
            ) : null}
          </li>
        ))}
      </ol>

      <p role="status" className="sr-only">
        {t("onboarding.stepLabel", { current: step + 1, total: STEPS.length })}
      </p>

      {step === 0 ? (
        <>
          <h2 className="text-title">{t("onboarding.chooseTitle")}</h2>
          <ul className="flex flex-col gap-3">
            {TEMPLATES.map((template) => (
              <li key={template.templateId}>
                <Panel className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-title">{pickLocalized(template.name, locale)}</h3>
                    <p className="text-meta text-ink-muted measure">
                      {pickLocalized(template.description, locale)}
                    </p>
                    <p className="text-label text-ink-muted">
                      {t(template.audienceKey as MessageKey)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => {
                        void applyTemplate(template.templateId, {
                          completeOnboarding: false,
                        }).then(() => setStep(1));
                      }}
                    >
                      <IconPlay />
                      {template.blocks.length === 0
                        ? t("onboarding.useEmpty")
                        : t("onboarding.useTemplate")}
                    </Button>
                    <Chip>
                      {t("onboarding.blocksPreview", {
                        count: template.blocks.length,
                        categories: template.categories.length,
                      })}
                    </Chip>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Panel>
            <p className="mb-3 text-meta text-ink-muted measure">{t("onboarding.tuneHint")}</p>
            <BlockListEditor dense />
          </Panel>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep(2)}>{t("onboarding.continue")}</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              {t("common.skip")}
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <Panel className="flex flex-col gap-3">
          <h2 className="text-title">{t("onboarding.readyTitle")}</h2>
          <p className="text-meta text-ink-muted measure">{t("onboarding.readyBody")}</p>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Chip>{t("settings.count.blocks", { count: blockTemplates.length })}</Chip>
            </li>
            <li>
              <Chip>{t("settings.count.categories", { count: categories.length })}</Chip>
            </li>
          </ul>
          <div>
            <Button onClick={() => void updateSettings({ onboardingCompleted: true })}>
              <IconPlay />
              {t("onboarding.openToday")}
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
