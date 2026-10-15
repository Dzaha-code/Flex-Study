"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { CategoryGlyph, IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import {
  EmptyState,
  Panel,
  PanelHeader,
  ProgressBar,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui/surface";
import { useAppStore } from "@/data/store";
import { monthKey, monthRecap, shiftMonth, todayISO, totalRecap, yearRecap } from "@/domain";
import type { BlockStatus } from "@/domain/types";
import { useI18n } from "@/i18n";

type Mode = "month" | "year";

const STATUS_ROWS: BlockStatus[] = ["done", "planned", "deferred", "skipped"];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-title-3 tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * The report card: a month, or a whole year, on one screen.
 *
 * Today deliberately stays a seven-day view. This is where the slower question
 * gets answered, and it is reached from Today and Week rather than taking a
 * sixth slot in the navigation — it is a place you visit, not a place you live.
 */
export function RecapScreen() {
  const categories = useAppStore((state) => state.categories);
  const instances = useAppStore((state) => state.instances);
  const reflections = useAppStore((state) => state.reflections);
  const { t, formatMinutes, formatMonthLabel, formatMonthShort } = useI18n();

  const [today] = useState(() => todayISO(Date.now()));
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState(() => monthKey(today));
  const [year, setYear] = useState(() => today.slice(0, 4));

  const options = useMemo(
    () => ({ categories, instances, reflections }),
    [categories, instances, reflections],
  );

  const months = useMemo(() => yearRecap(options, year), [options, year]);
  const recap = useMemo(
    () => (mode === "month" ? monthRecap(options, month) : totalRecap(months, year)),
    [mode, options, month, months, year],
  );

  const label = mode === "month" ? formatMonthLabel(month) : year;
  const total = recap.doneBlocks + recap.plannedBlocks + recap.deferredBlocks + recap.skippedBlocks;
  const hasActivity = total > 0 || recap.journalEntries > 0;

  function shift(delta: number) {
    if (mode === "month") setMonth((value) => shiftMonth(value, delta));
    else setYear((value) => String(Number(value) + delta));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="inline-flex h-11 w-fit items-center gap-2 rounded-control border border-line-strong bg-surface-raised px-4 text-meta hover:bg-accent-surface"
        >
          <IconArrowLeft size={16} />
          {t("common.back")}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-display">{t("recap.title")}</h1>
          <p className="text-meta text-ink-muted">{t("recap.subtitle")}</p>
        </div>
      </header>

      {/* The tour's target: compact, always present, and the thing to explain
          first — the report below it is read, this is what you operate. */}
      <div
        data-tour="recap-summary"
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <SegmentedControl
          legend={t("recap.modeLabel")}
          name="recap-mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "month", label: t("recap.mode.month") },
            { value: "year", label: t("recap.mode.year") },
          ]}
        />
        <div className="flex items-center gap-1">
          <IconButton label={t("recap.previous")} onClick={() => shift(-1)}>
            <IconArrowLeft />
          </IconButton>
          <span className="min-w-40 text-center text-body font-medium" aria-live="polite">
            {label}
          </span>
          <IconButton label={t("recap.next")} onClick={() => shift(1)}>
            <IconArrowRight />
          </IconButton>
        </div>
      </div>

      {/* Keyed on the period, so stepping through months replays one short fade
          on the whole body instead of animating every card separately. */}
      <div key={label} className="recap-enter flex flex-col gap-6">
        {!hasActivity ? (
          <Panel>
            <EmptyState title={label} body={t("recap.empty")} />
          </Panel>
        ) : (
          <>
            <Panel>
              <PanelHeader
                title={label}
                description={t("recap.percentOfTarget", {
                  percent: Math.round(recap.percent * 100),
                })}
              />
              <ProgressBar
                value={recap.percent}
                label={`${label}: ${t("recap.targetLine", {
                  done: formatMinutes(recap.doneMinutes),
                  target: formatMinutes(recap.targetMinutes),
                })}`}
              />
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Stat
                  label={t("recap.doneMinutes")}
                  value={formatMinutes(recap.doneMinutes)}
                />
                <Stat
                  label={t("recap.targetMinutes")}
                  value={formatMinutes(recap.targetMinutes)}
                />
                <Stat label={t("recap.blocksDone")} value={String(recap.doneBlocks)} />
                <Stat label={t("recap.activeDays")} value={String(recap.activeDays)} />
                <Stat label={t("recap.longestStreak")} value={String(recap.longestStreak)} />
                <Stat label={t("recap.journalEntries")} value={String(recap.journalEntries)} />
                <Stat label={t("recap.journalWords")} value={String(recap.journalWords)} />
                <Stat label={t("recap.favorites")} value={String(recap.favoriteEntries)} />
              </dl>
            </Panel>

            <Panel>
              <PanelHeader title={t("recap.byCategory")} />
              {recap.byCategory.length === 0 ? (
                <p className="text-meta text-ink-muted">{t("recap.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {recap.byCategory.map((entry) => (
                    <li key={entry.categoryId} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="flex items-center gap-2 text-body font-medium">
                          <CategoryGlyph icon={entry.icon} />
                          {entry.name}
                        </span>
                        <span className="text-meta text-ink-muted">
                          {t("recap.targetLine", {
                            done: formatMinutes(entry.doneMinutes),
                            target: formatMinutes(entry.targetMinutes),
                          })}
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
              <PanelHeader title={t("recap.statusBreakdown")} />
              <ul className="flex flex-col gap-2">
                {STATUS_ROWS.map((status) => (
                  <li
                    key={status}
                    className="flex items-center justify-between gap-3 text-meta"
                  >
                    <StatusBadge status={status} />
                    <span className="tabular-nums text-ink-muted">
                      {status === "done"
                        ? recap.doneBlocks
                        : status === "planned"
                          ? recap.plannedBlocks
                          : status === "deferred"
                            ? recap.deferredBlocks
                            : recap.skippedBlocks}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            {mode === "year" ? (
              <Panel>
                <PanelHeader title={t("recap.monthTable")} />
                <ul className="flex flex-col divide-y divide-line">
                  {months.map((entry) => (
                    <li key={entry.month}>
                      <button
                        type="button"
                        onClick={() => {
                          setMonth(entry.month);
                          setMode("month");
                        }}
                        className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-accent-surface/40"
                      >
                        <span className="w-10 shrink-0 text-label text-ink-muted">
                          {formatMonthShort(entry.month)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <ProgressBar
                            value={entry.percent}
                            height={4}
                            label={`${formatMonthLabel(entry.month)}: ${formatMinutes(entry.doneMinutes)}`}
                          />
                        </span>
                        <span className="shrink-0 text-label tabular-nums text-ink-muted">
                          {formatMinutes(entry.doneMinutes)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
