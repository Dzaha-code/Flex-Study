"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconBook, IconCheck, IconCompass, IconLightbulb, IconPlay } from "@/components/ui/icons";
import { Panel, PanelHeader, StatusBadge } from "@/components/ui/surface";
import type { BlockStatus } from "@/domain/types";
import { useI18n, type MessageKey } from "@/i18n";
import { startTour } from "@/features/tour/tour-store";

const QUICK_STEPS: MessageKey[] = [
  "guide.quick.1",
  "guide.quick.2",
  "guide.quick.3",
  "guide.quick.4",
];

const SCREENS: { href: string; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { href: "/", titleKey: "guide.screens.today.title", bodyKey: "guide.screens.today.body" },
  { href: "/week", titleKey: "guide.screens.week.title", bodyKey: "guide.screens.week.body" },
  { href: "/journal", titleKey: "guide.screens.journal.title", bodyKey: "guide.screens.journal.body" },
  { href: "/settings", titleKey: "guide.screens.settings.title", bodyKey: "guide.screens.settings.body" },
];

const TIPS: MessageKey[] = [
  "guide.tips.1",
  "guide.tips.2",
  "guide.tips.3",
  "guide.tips.4",
  "guide.tips.5",
  "guide.tips.6",
];

/** Every status is shown with the real badge, so the guide cannot drift. */
const GLOSSARY: BlockStatus[] = ["planned", "running", "done", "deferred", "skipped"];

const STATUS_BODY: Record<BlockStatus, MessageKey> = {
  planned: "guide.glossary.planned",
  running: "guide.glossary.running",
  done: "guide.glossary.done",
  deferred: "guide.glossary.deferred",
  skipped: "guide.glossary.skipped",
};

/**
 * The written counterpart to the guided tour: someone who wants to read before
 * clicking gets the same explanation in order, and the tour is one button away
 * for anyone who would rather be shown.
 */
export function GuideScreen() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-display">{t("guide.title")}</h1>
        <p className="measure text-meta text-ink-muted">{t("guide.subtitle")}</p>
        <div className="flex flex-wrap items-center gap-3" data-tour="guide-replay">
          <Button onClick={startTour}>
            <IconPlay />
            {t("guide.startTour")}
          </Button>
          <span className="text-label text-ink-muted">{t("guide.tourHint")}</span>
        </div>
      </header>

      <Panel data-tour="guide-quick">
        <PanelHeader
          title={t("guide.quick.title")}
          description={t("guide.quick.hint")}
          headingLevel={2}
        />
        <ol className="flex flex-col gap-3">
          {QUICK_STEPS.map((key, index) => (
            <li key={key} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-caption font-medium"
              >
                {index + 1}
              </span>
              <p className="min-w-0 text-body">{t(key)}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <section className="flex flex-col gap-3">
        <h2 className="text-title-2">{t("guide.screens.title")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SCREENS.map(({ href, titleKey, bodyKey }) => (
            <li key={href}>
              <Panel className="flex h-full flex-col gap-2">
                <h3 className="flex items-center gap-2 text-title-3">
                  <IconCompass width={18} height={18} className="text-ink-muted" />
                  {t(titleKey)}
                </h3>
                <p className="text-meta text-ink-muted">{t(bodyKey)}</p>
                <Link
                  href={href}
                  className="mt-auto text-label font-medium text-accent underline underline-offset-2"
                >
                  {t("guide.openScreen")}
                </Link>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      <Panel>
        <PanelHeader
          title={t("guide.tips.title")}
          description={t("guide.tips.hint")}
          headingLevel={2}
        />
        <ul className="flex flex-col gap-3">
          {TIPS.map((key) => (
            <li key={key} className="flex items-start gap-2.5">
              <IconLightbulb width={16} height={16} className="mt-1 shrink-0 text-ink-muted" />
              <p className="min-w-0 text-body">{t(key)}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel data-tour="guide-glossary">
        <PanelHeader
          title={t("guide.glossary.title")}
          description={t("guide.glossary.hint")}
          headingLevel={2}
        />
        <dl className="flex flex-col divide-y divide-line">
          {GLOSSARY.map((status) => (
            <div key={status} className="flex flex-wrap items-start gap-3 py-2.5">
              <dt className="flex w-32 shrink-0 items-center">
                <StatusBadge status={status} />
              </dt>
              <dd className="min-w-0 flex-1 text-body text-ink-muted">
                {t(STATUS_BODY[status])}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-title-3">
          <IconBook width={18} height={18} className="text-ink-muted" />
          {t("guide.offline.title")}
        </h2>
        <p className="measure text-meta text-ink-muted">{t("guide.offline.body")}</p>
        <ul className="flex flex-col gap-2">
          <li className="flex items-start gap-2.5">
            <IconCheck width={16} height={16} className="mt-1 shrink-0 text-ok" />
            <span className="text-body">{t("guide.offline.point1")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <IconCheck width={16} height={16} className="mt-1 shrink-0 text-ok" />
            <span className="text-body">{t("guide.offline.point2")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <IconCheck width={16} height={16} className="mt-1 shrink-0 text-ok" />
            <span className="text-body">{t("guide.offline.point3")}</span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
