"use client";

import { useMemo, type ReactNode } from "react";
import { CategoryGlyph } from "@/components/ui/icons";
import {
  journalStats,
  noteShareByCategory,
  recentLearnings,
  writingHeatmap,
  type HeatCell,
} from "@/domain";
import type { Category, Reflection } from "@/domain/types";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The journal's picture of itself.
 *
 * Three ideas borrowed from journaling apps people actually keep using, each
 * redrawn in this app's own language (ink on paper, one stabilo highlight):
 *
 * - a writing map like a contribution graph: consistency reads at a glance,
 *   and one tap opens the day;
 * - a few large numbers (streak, entries, words) instead of a dashboard;
 * - the learnings people wrote, surfaced as quotes, because re-reading them is
 *   the point of writing them down.
 *
 * All the numbers come from `domain/journal-insights`, which is pure and tested.
 */

const HEAT_WEEKS = 20;

function StatTile({
  value,
  label,
  detail,
  highlight = false,
}: {
  value: string;
  label: string;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-panel border border-line bg-surface p-3">
      <span className="text-label text-ink-muted">{label}</span>
      <span className="text-title-2 font-semibold tabular-nums">
        {highlight ? <span className="stabilo !text-[length:inherit] !px-1.5">{value}</span> : value}
      </span>
      {detail ? <span className="truncate text-caption text-mute">{detail}</span> : null}
    </div>
  );
}

function HeatCellView({
  cell,
  selected,
  onPick,
}: {
  cell: HeatCell;
  selected: boolean;
  onPick: (date: string) => void;
}) {
  const { t, formatDateLong } = useI18n();
  const label = cell.hasEntry
    ? t("journal.map.cellWritten", { date: formatDateLong(cell.date), count: cell.words })
    : t("journal.map.cellEmpty", { date: formatDateLong(cell.date) });

  if (cell.future) {
    return <span aria-hidden="true" className="heat-cell size-3.5" data-future="true" />;
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => onPick(cell.date)}
      className="heat-cell size-3.5"
      data-level={cell.level}
      data-favorite={cell.favorite}
      data-selected={selected}
    />
  );
}

export function WritingOverview({
  reflections,
  today,
  selected,
  weekStart,
  onPickDate,
}: {
  reflections: Reflection[];
  today: string;
  selected: string;
  weekStart: 0 | 1;
  onPickDate: (date: string) => void;
}) {
  const { t, formatMonthShort, formatWeekdayIndex } = useI18n();

  const stats = useMemo(() => journalStats(reflections, today), [reflections, today]);
  const columns = useMemo(
    () => writingHeatmap(reflections, today, HEAT_WEEKS, weekStart),
    [reflections, today, weekStart],
  );

  // A month label sits above the first column that starts in that month.
  const monthLabels = columns.map((column, index) => {
    const month = column[0]?.date.slice(0, 7) ?? "";
    const previous = index > 0 ? columns[index - 1]?.[0]?.date.slice(0, 7) : null;
    return month !== previous ? formatMonthShort(month) : "";
  });

  const rowLabels = Array.from({ length: 7 }, (_, row) => (weekStart + row) % 7);
  const writtenInMap = columns.flat().filter((cell) => cell.hasEntry).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label={t("journal.stats.streak")}
          value={t("journal.stats.days", { count: stats.currentStreak })}
          detail={t("journal.stats.longest", { count: stats.longestStreak })}
          highlight={stats.currentStreak > 0}
        />
        <StatTile
          label={t("journal.stats.entries")}
          value={String(stats.entries)}
          detail={t("journal.stats.favorites", { count: stats.favorites })}
        />
        <StatTile
          label={t("journal.stats.words")}
          value={stats.totalWords.toLocaleString()}
          detail={t("journal.stats.average", { count: stats.averageWords })}
        />
        <StatTile
          label={t("journal.stats.map")}
          value={String(writtenInMap)}
          detail={t("journal.stats.mapDetail", { weeks: HEAT_WEEKS })}
        />
      </div>

      <figure className="flex flex-col gap-2">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-body font-medium">{t("journal.map.title")}</span>
          <span className="text-caption text-mute">{t("journal.map.hint")}</span>
        </figcaption>

        {/* Scrolls inside itself on a narrow phone; the page never does. */}
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex flex-col gap-1">
            <div className="flex gap-[3px] pl-8">
              {monthLabels.map((label, index) => (
                <span key={index} className="w-3.5 overflow-visible whitespace-nowrap text-[11px] leading-none text-ink-muted">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              <div className="flex w-7 flex-col gap-[3px] pr-1">
                {rowLabels.map((day, row) => (
                  <span key={day} className="h-3.5 text-right text-[10px] leading-[14px] text-ink-muted">
                    {row % 2 === 0 ? formatWeekdayIndex(day) : ""}
                  </span>
                ))}
              </div>
              {columns.map((column) => (
                <div key={column[0]?.date} className="flex flex-col gap-[3px]">
                  {column.map((cell) => (
                    <HeatCellView
                      key={cell.date}
                      cell={cell}
                      selected={cell.date === selected}
                      onPick={onPickDate}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-mute">
          <span className="flex items-center gap-1.5">
            {t("journal.map.less")}
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} aria-hidden="true" className="heat-cell size-3" data-level={level} />
            ))}
            {t("journal.map.more")}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="heat-cell size-3" data-level={2} data-favorite="true" />
            {t("journal.map.favorite")}
          </span>
        </div>
      </figure>
    </div>
  );
}

/** The take-aways as quotes: the part of a journal most worth re-reading. */
export function LearningsWall({
  reflections,
  onOpen,
}: {
  reflections: Reflection[];
  onOpen: (reflectionId: string) => void;
}) {
  const { t, formatDateShort } = useI18n();
  const items = useMemo(() => recentLearnings(reflections, 6), [reflections]);

  if (items.length === 0) {
    return <p className="text-meta text-ink-muted">{t("journal.learningsWall.empty")}</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <li key={`${item.reflectionId}-${index}`} className="flex">
          <button
            type="button"
            onClick={() => onOpen(item.reflectionId)}
            className="journal-card flex w-full flex-col gap-2 rounded-panel border border-line bg-surface p-4 text-left"
          >
            <span aria-hidden="true" className="font-display text-title-2 leading-none text-hl-rule">
              &ldquo;
            </span>
            <span className="line-clamp-4 text-body text-ink">{item.text}</span>
            <span className="mt-auto text-caption text-mute">{formatDateShort(item.date)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One entry as a card: the date as a calendar leaf, the words as a teaser. */
export function EntryCard({
  reflection,
  heading,
  preview,
  selected,
  onOpen,
  favoriteButton,
}: {
  reflection: Reflection;
  heading: string;
  preview: string;
  selected: boolean;
  onOpen: () => void;
  /** The star stays its own control, outside the card's open button. */
  favoriteButton: ReactNode;
}) {
  const { t, formatWeekdayShort, formatMonthShort } = useI18n();
  const learnings = reflection.learnings.filter((item) => item.trim() !== "").length;

  return (
    <article
      className={cn(
        "journal-card relative flex flex-col rounded-panel border bg-raised",
        selected ? "border-ink" : "border-line",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("journal.openDetail", { title: heading })}
        className="flex flex-1 flex-col gap-3 p-4 pr-12 text-left"
      >
        <span className="flex items-center gap-3">
          {/* The date as a small calendar leaf: the day carries the weight. */}
          <span className="flex w-11 shrink-0 flex-col items-center rounded-ctl border border-line-strong py-1">
            <span className="text-[11px] uppercase leading-none tracking-wide text-ink-muted">
              {formatMonthShort(reflection.date.slice(0, 7))}
            </span>
            <span className="text-numeral font-semibold tabular-nums">
              {Number(reflection.date.slice(8))}
            </span>
            <span className="text-[11px] leading-none text-ink-muted">
              {formatWeekdayShort(reflection.date)}
            </span>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="line-clamp-2 text-body font-medium">{heading}</span>
            <span className="flex flex-wrap gap-x-2 text-caption text-mute">
              <span>{t("journal.words", { count: reflection.wordCount })}</span>
              {learnings > 0 ? (
                <span>· {t("journal.card.learnings", { count: learnings })}</span>
              ) : null}
            </span>
          </span>
        </span>
        {preview ? <span className="line-clamp-3 text-meta text-ink-muted">{preview}</span> : null}
        {/* Length as a ruled line: a long day looks long before it is read. */}
        <span aria-hidden="true" className="mt-auto h-1 w-full overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-ink"
            style={{ width: `${Math.min(100, Math.round((reflection.wordCount / 300) * 100))}%` }}
          />
        </span>
      </button>
      <div className="absolute right-1.5 top-1.5">{favoriteButton}</div>
      {reflection.favorite ? <span className="sr-only">{t("journal.favoriteBadge")}</span> : null}
    </article>
  );
}

/** How block notes spread over categories, as one ruled bar plus a legend. */
export function NoteShareBar({
  instances,
  categories,
}: {
  instances: Parameters<typeof noteShareByCategory>[0];
  categories: Category[];
}) {
  const { t } = useI18n();
  const shares = useMemo(() => noteShareByCategory(instances), [instances]);
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  if (total === 0) return null;
  const byId = new Map(categories.map((category) => [category.id, category]));
  // Shades of ink, not hues: categories are told apart by glyph and name.
  const levels = [4, 3, 2, 1] as const;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-caption text-mute">{t("journal.notes.share", { count: total })}</figcaption>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
        {shares.map((share, index) => (
          <span
            key={share.categoryId}
            className="heat-cell h-full !rounded-none border-r-2 border-raised last:border-r-0"
            data-level={levels[Math.min(index, levels.length - 1)]}
            style={{ width: `${share.share * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink">
        {shares.map((share, index) => {
          const category = byId.get(share.categoryId);
          return (
            <li key={share.categoryId} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="heat-cell size-2.5"
                data-level={levels[Math.min(index, levels.length - 1)]}
              />
              {category ? <CategoryGlyph icon={category.icon} className="text-mute" /> : null}
              <span>{category?.name ?? "—"}</span>
              <span className="text-mute tabular-nums">{share.count}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

