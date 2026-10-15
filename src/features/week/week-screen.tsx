"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconInfo } from "@/components/ui/icons";
import { Panel, PanelHeader, ProgressBar, StatusBadge } from "@/components/ui/surface";
import { useAppStore } from "@/data/store";
import { addDays, startOfWeek, todayISO } from "@/domain";
import { categoryProgressForWeek } from "@/domain/targets";
import type { BlockStatus } from "@/domain/types";
import { weekOffset, weekRecap } from "@/domain/week";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";

const MAX_MARKS = 8;

function markTone(status: BlockStatus): string {
  switch (status) {
    case "done":
      return "border-ok bg-ok";
    case "running":
      return "border-accent bg-accent";
    case "deferred":
      return "border-warn bg-warn-surface";
    case "skipped":
      return "border-line bg-line";
    default:
      return "border-line-strong bg-surface";
  }
}

export function WeekScreen() {
  const [offset, setOffset] = useState(0);
  const settings = useAppStore((state) => state.settings);
  const instances = useAppStore((state) => state.instances);
  const categories = useAppStore((state) => state.categories);
  const ensureRange = useAppStore((state) => state.ensureRange);
  const { t, formatDateShort, formatMinutes } = useI18n();

  const [today] = useState(() => todayISO(Date.now()));
  const currentWeekStart = startOfWeek(today, settings.weekStart);
  const weekStart = weekOffset(currentWeekStart, offset);
  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    void ensureRange(weekStart, weekEnd);
  }, [ensureRange, weekStart, weekEnd]);

  const recap = useMemo(
    () => weekRecap({ categories, instances, weekStartISO: weekStart }),
    [categories, instances, weekStart],
  );

  const perCategory = useMemo(
    () => categoryProgressForWeek({ categories, instances, weekStartISO: weekStart }),
    [categories, instances, weekStart],
  );

  const weekInstances = useMemo(
    () => instances.filter((instance) => instance.date >= weekStart && instance.date <= weekEnd),
    [instances, weekStart, weekEnd],
  );

  const daySummaries = useMemo(
    () =>
      recap.dates.map((date) => {
        const blocks = weekInstances.filter((instance) => instance.date === date);
        const timelineBlocks = blocks.filter(
          (instance) => instance.status !== "deferred" && instance.status !== "skipped",
        );
        return {
          date,
          blocks,
          done: blocks.filter((instance) => instance.status === "done").length,
          total: timelineBlocks.length,
        };
      }),
    [recap.dates, weekInstances],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3" data-tour="week-header">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-display">{t("week.title")}</h1>
            <p className="text-meta text-ink-muted">
              {t("week.range", { start: formatDateShort(weekStart), end: formatDateShort(weekEnd) })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton label={t("week.previous")} onClick={() => setOffset((value) => value - 1)}>
              <IconArrowLeft />
            </IconButton>
            <IconButton label={t("week.next")} onClick={() => setOffset((value) => value + 1)}>
              <IconArrowRight />
            </IconButton>
          </div>
        </div>
      </header>

      <section aria-labelledby="week-grid-heading" data-tour="week-grid">
        <h2 id="week-grid-heading" className="sr-only">
          {t("week.grid")}
        </h2>
        <ol className="grid grid-cols-7 gap-1.5">
          {daySummaries.map((day) => {
            const isToday = day.date === today;
            const shown = day.blocks.slice(0, MAX_MARKS);
            const overflow = day.blocks.length - shown.length;
            return (
              <li
                key={day.date}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-panel border p-1.5",
                  isToday ? "border-accent bg-accent-surface" : "border-line bg-surface-raised",
                )}
              >
                <span
                  className={cn(
                    "text-label font-medium",
                    isToday ? "text-accent" : "text-ink-muted",
                  )}
                >
                  {t("week.dayCount", { done: day.done, total: day.total })}
                </span>
                <ul className="flex w-full flex-col items-center gap-1">
                  {shown.map((instance) => (
                    <li
                      key={instance.id}
                      className={cn("h-2.5 w-full rounded-[3px] border", markTone(instance.status))}
                    />
                  ))}
                  {overflow > 0 ? (
                    <li className="text-label text-ink-muted">+{overflow}</li>
                  ) : null}
                  {day.blocks.length === 0 ? (
                    <li className="h-2.5 w-full rounded-[3px] border border-dashed border-line" />
                  ) : null}
                </ul>
                <span className={cn("text-label", isToday ? "text-accent" : "text-ink-muted")}>
                  {formatDateShort(day.date)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <Panel data-tour="week-targets">
        <PanelHeader title={t("week.targets")} />
        {perCategory.length === 0 ? (
          <p className="text-meta text-ink-muted">{t("week.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {perCategory.map((entry) => (
              <li key={entry.categoryId} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-body font-medium">{entry.name}</span>
                  <span className="text-meta text-ink-muted">
                    {entry.targetMinutes > 0
                      ? t("week.targetLine", {
                          done: formatMinutes(entry.doneMinutes),
                          target: formatMinutes(entry.targetMinutes),
                        })
                      : t("week.noTarget")}
                  </span>
                </div>
                <ProgressBar
                  value={entry.percent}
                  height={4}
                  label={`${entry.name}: ${formatMinutes(entry.doneMinutes)}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title={t("week.recap")} />
        <ul className="flex flex-col gap-2">
          <li className="text-meta">
            {t("week.recapDone", { done: recap.doneBlocks, planned: recap.plannedBlocks })}
          </li>
          {recap.deferredBlocks > 0 ? (
            <li className="flex items-center gap-2 text-meta text-warn">
              <StatusBadge status="deferred" />
              {t("week.recapDeferred", { count: recap.deferredBlocks })}
            </li>
          ) : null}
          {recap.skippedBlocks > 0 ? (
            <li className="flex items-center gap-2 text-meta text-ink-muted">
              <StatusBadge status="skipped" />
              {t("week.recapSkipped", { count: recap.skippedBlocks })}
            </li>
          ) : null}
        </ul>

        {recap.mostDeferred.length > 0 ? (
          <div className="mt-4 flex flex-col gap-1.5">
            <h3 className="text-label font-semibold uppercase tracking-wide text-ink-muted">
              {t("week.mostDeferred")}
            </h3>
            <ul className="flex flex-col gap-1">
              {recap.mostDeferred.map((entry) => (
                <li key={entry.title} className="text-meta text-ink-muted">
                  {t("week.mostDeferredLine", { title: entry.title, count: entry.count })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex items-start gap-2 rounded-panel border border-line bg-surface p-3">
          <IconInfo width={16} height={16} className="mt-0.5 shrink-0 text-ink-muted" />
          <p className="text-meta measure">
            <span className="font-semibold">{t("week.suggestionLabel")}: </span>
            {t(recap.suggestion.key as MessageKey, recap.suggestion.params)}
          </p>
        </div>
      </Panel>
    </div>
  );
}
