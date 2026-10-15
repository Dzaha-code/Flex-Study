"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm";
import { Sheet } from "@/components/ui/dialog";
import { TextInput } from "@/components/ui/field";
import { IconCaretDown, IconDownload, IconPlus, IconStar, IconStarFilled } from "@/components/ui/icons";
import { Chip, EmptyState, Panel, PanelHeader, SegmentedControl } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import {
  countWords,
  hasContent,
  LEARNING_SLOTS,
  monthKey,
  normalizeLearnings,
  promptIdForDate,
  reflectionMatches,
  reflectionPreview,
  todayISO,
} from "@/domain";
import type { Reflection } from "@/domain/types";
import { useI18n, type MessageKey } from "@/i18n";
import { downloadTextFile } from "@/lib/download";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { reflectionsToMarkdown } from "./export-markdown";

const AUTOSAVE_DELAY_MS = 800;

/**
 * A title on its own is an entry worth keeping — people name a day before they
 * describe it — so the autosave guard has to consider it, not just the body.
 */
function hasEntry(title: string, body: string, learnings: string[]): boolean {
  return title.trim() !== "" || hasContent({ body, learnings });
}

/** The heading of an entry: its title, or the date when it has none. */
function headingOf(reflection: Reflection, fallback: string): string {
  return reflection.title.trim() !== "" ? reflection.title : fallback;
}

function JournalEditor({
  date,
  existing,
  promptId,
}: {
  date: string;
  existing: Reflection | null;
  promptId: string;
}) {
  const saveReflection = useAppStore((state) => state.saveReflection);
  const { t, formatDateLong } = useI18n();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [learnings, setLearnings] = useState<string[]>(
    normalizeLearnings(existing?.learnings ?? []),
  );

  const wordCount = useMemo(() => countWords(body), [body]);
  const filled = hasEntry(title, body, learnings);

  // Save automatically, but never create an empty entry just by opening the page.
  useEffect(() => {
    if (!hasEntry(title, body, learnings)) return;
    const timer = setTimeout(() => {
      void saveReflection({ date, title, body, learnings, promptId });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, body, learnings, date, promptId, saveReflection]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body font-semibold">{formatDateLong(date)}</h3>
        <div className="flex items-center gap-2">
          <Chip>{t("journal.words", { count: wordCount })}</Chip>
          {filled ? (
            <span aria-live="polite" className="text-label text-ok">
              {t("journal.saved")}
            </span>
          ) : null}
        </div>
      </div>

      <TextInput
        label={t("journal.titleLabel")}
        placeholder={t("journal.titlePlaceholder")}
        maxLength={120}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-label font-medium text-ink-muted">{t("journal.promptLabel")}</p>
        <p className="text-body text-ink">{t(promptId as MessageKey)}</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-label font-medium text-ink-muted">{t("journal.bodyLabel")}</span>
        <textarea
          value={body}
          rows={8}
          maxLength={50_000}
          placeholder={t("journal.bodyPlaceholder")}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-40 w-full resize-y rounded-control border border-line-strong bg-surface-raised px-3 py-2 text-body leading-relaxed text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>

      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 text-label font-medium text-ink-muted">
          {t("journal.learningsLabel")}
        </legend>
        {Array.from({ length: LEARNING_SLOTS }, (_, index) => (
          <TextInput
            key={index}
            label={t("journal.learningSlot", { index: index + 1 })}
            value={learnings[index] ?? ""}
            maxLength={500}
            onChange={(event) => {
              const next = [...learnings];
              next[index] = event.target.value;
              setLearnings(normalizeLearnings(next));
            }}
          />
        ))}
      </fieldset>

      {body.trim() !== "" ? (
        <details className="rounded-panel border border-line bg-surface p-3">
          <summary className="cursor-pointer text-label font-medium text-ink-muted">
            {t("today.noteHint")}
          </summary>
          <div className="pt-2 text-body text-ink">{renderMarkdown(body)}</div>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Read-only view of one entry.
 *
 * All of an entry's actions live here rather than on the history row, so the
 * list stays a list: one tap to read, one tap on the star to mark the day, and
 * the destructive action sits behind this sheet instead of next to every date.
 */
function JournalDetailSheet({
  reflection,
  onClose,
  onEdit,
  onDelete,
}: {
  reflection: Reflection | null;
  onClose: () => void;
  onEdit: (reflection: Reflection) => void;
  onDelete: (reflection: Reflection) => void;
}) {
  const { t, formatDateLong } = useI18n();

  const learnings = reflection?.learnings.filter((item) => item.trim() !== "") ?? [];

  return (
    <Sheet
      open={reflection !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={reflection ? reflection.title.trim() || formatDateLong(reflection.date) : ""}
      description={
        reflection
          ? `${formatDateLong(reflection.date)} · ${t("journal.words", { count: reflection.wordCount })}`
          : undefined
      }
      footer={
        reflection ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="danger" onClick={() => onDelete(reflection)}>
              {t("journal.delete")}
            </Button>
            <Button size="sm" onClick={() => onEdit(reflection)}>
              {t("common.edit")}
            </Button>
          </div>
        ) : null
      }
    >
      {reflection ? (
        <div className="flex flex-col gap-4">
          {reflection.favorite ? (
            <div className="flex">
              <Chip icon={<IconStarFilled size={14} className="text-accent" />}>
                {t("journal.favoriteBadge")}
              </Chip>
            </div>
          ) : null}

          {reflection.body.trim() !== "" ? (
            <div className="text-body leading-relaxed text-ink">
              {renderMarkdown(reflection.body)}
            </div>
          ) : (
            <p className="text-meta text-ink-muted">{t("journal.detailEmpty")}</p>
          )}

          {learnings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-label font-semibold uppercase tracking-wide text-ink-muted">
                {t("journal.learningsLabel")}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {learnings.map((learning, index) => (
                  <li key={index} className="flex gap-2 text-meta text-ink">
                    <span aria-hidden="true" className="text-ink-muted">
                      —
                    </span>
                    <span>{learning}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}

type HistoryFilter = "all" | "favorite";

export function JournalScreen() {
  const reflections = useAppStore((state) => state.reflections);
  const deleteReflection = useAppStore((state) => state.deleteReflection);
  const setReflectionFavorite = useAppStore((state) => state.setReflectionFavorite);
  const { t, formatDateLong, formatMonthLabel } = useI18n();

  const [today] = useState(() => todayISO(Date.now()));
  const [selected, setSelected] = useState(today);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Bumped to rebuild the editor from scratch after its entry is deleted —
  // without it the editor would still hold the old text and save it straight
  // back, quietly resurrecting what was just removed.
  const [editorVersion, setEditorVersion] = useState(0);

  const existing = reflections.find((reflection) => reflection.date === selected) ?? null;
  const promptId = existing?.promptId ?? promptIdForDate(selected);
  const detail = reflections.find((reflection) => reflection.id === detailId) ?? null;
  const pendingDelete = reflections.find((reflection) => reflection.id === deleteId) ?? null;

  const visible = useMemo(() => {
    return [...reflections]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(
        (reflection) =>
          (filter === "all" || reflection.favorite) && reflectionMatches(reflection, query),
      );
  }, [reflections, filter, query]);

  const groups = useMemo(() => {
    const buckets = new Map<string, Reflection[]>();
    for (const reflection of visible) {
      const key = monthKey(reflection.date);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(reflection);
      else buckets.set(key, [reflection]);
    }
    return [...buckets.entries()].map(([month, entries]) => ({ month, entries }));
  }, [visible]);

  // While searching, a collapsed month would hide the very thing that matched.
  const searching = query.trim() !== "" || filter !== "all";
  const isCollapsed = (month: string, index: number) =>
    searching ? false : (collapsed[month] ?? index > 0);

  function handleExport() {
    if (reflections.length === 0) return;
    const markdown = reflectionsToMarkdown(reflections, {
      title: t("journal.title"),
      learnings: t("journal.learningsLabel"),
      favorite: t("journal.favoriteBadge"),
    });
    downloadTextFile(`${today}-flexstudy-journal.md`, markdown, "text/markdown");
    toastManager.add({ title: t("journal.exported"), timeout: 4_000 });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    void deleteReflection(pendingDelete.id);
    if (pendingDelete.date === selected) setSelected(today);
    setEditorVersion((version) => version + 1);
    setDeleteId(null);
    setDetailId(null);
    toastManager.add({ title: t("journal.deleted"), timeout: 4_000 });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3" data-tour="journal-header">
        <div className="flex flex-col gap-1">
          <h1 className="text-display">{t("journal.title")}</h1>
          <p className="text-meta text-ink-muted">
            {reflections.length > 0
              ? t("journal.words", {
                  count: reflections.reduce((sum, item) => sum + item.wordCount, 0),
                })
              : t("journal.empty.body")}
          </p>
        </div>
        <Button variant="secondary" disabled={reflections.length === 0} onClick={handleExport}>
          <IconDownload />
          {t("journal.exportMarkdown")}
        </Button>
      </header>

      <Panel data-tour="journal-entry">
        <PanelHeader
          title={selected === today ? t("journal.todayEntry") : formatDateLong(selected)}
          description={t("journal.bodyPlaceholder")}
          action={
            selected === today ? null : (
              <Button size="sm" variant="secondary" onClick={() => setSelected(today)}>
                <IconPlus />
                {t("journal.todayEntry")}
              </Button>
            )
          }
        />
        <JournalEditor
          key={`${selected}-${editorVersion}`}
          date={selected}
          existing={existing}
          promptId={promptId}
        />
      </Panel>

      <Panel data-tour="journal-history">
        <PanelHeader title={t("journal.history")} />

        {reflections.length === 0 ? (
          <EmptyState
            title={t("journal.empty.title")}
            body={t("journal.empty.body")}
            action={<Button onClick={() => setSelected(today)}>{t("journal.empty.cta")}</Button>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <TextInput
                  label={t("journal.searchLabel")}
                  type="search"
                  placeholder={t("journal.searchPlaceholder")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <SegmentedControl
                legend={t("journal.filterLabel")}
                name="journal-filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: t("journal.filter.all") },
                  { value: "favorite", label: t("journal.filter.favorite") },
                ]}
              />
            </div>

            {visible.length === 0 ? (
              <p className="text-meta text-ink-muted">
                {filter === "favorite" && query.trim() === ""
                  ? t("journal.noFavorite")
                  : t("journal.searchEmpty")}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((group, index) => {
                  const open = !isCollapsed(group.month, index);
                  return (
                    <section key={group.month} className="flex flex-col">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setCollapsed((previous) => ({
                            ...previous,
                            [group.month]: open,
                          }))
                        }
                        className="flex items-center justify-between gap-2 rounded-ctl px-1 py-2 text-left hover:bg-accent-surface/40"
                      >
                        <span className="text-label font-semibold uppercase tracking-wide text-ink-muted">
                          {formatMonthLabel(group.month)}
                        </span>
                        <span className="flex items-center gap-2 text-label text-ink-muted">
                          {t("journal.entryCount", { count: group.entries.length })}
                          <IconCaretDown
                            size={14}
                            className={cn(
                              "transition-transform duration-200 motion-reduce:transition-none",
                              open ? "rotate-180" : "rotate-0",
                            )}
                          />
                        </span>
                      </button>

                      {open ? (
                        <ul className="flex flex-col divide-y divide-line">
                          {group.entries.map((reflection) => {
                            const heading = headingOf(reflection, formatDateLong(reflection.date));
                            const preview =
                              reflectionPreview(reflection.body) ||
                              reflection.learnings.filter(Boolean).join(" · ");
                            return (
                              <li key={reflection.id} className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDetailId(reflection.id)}
                                  aria-label={t("journal.openDetail", { title: heading })}
                                  className="flex min-w-0 flex-1 flex-col gap-1 py-3 text-left hover:bg-accent-surface/40"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={cn(
                                        "truncate text-body",
                                        reflection.date === selected && "font-medium text-accent",
                                      )}
                                    >
                                      {heading}
                                    </span>
                                    {reflection.favorite ? (
                                      <IconStarFilled size={14} className="shrink-0 text-accent" />
                                    ) : null}
                                  </span>
                                  <span className="flex flex-wrap items-baseline gap-x-2 text-label text-ink-muted">
                                    <span>{formatDateLong(reflection.date)}</span>
                                    <span>
                                      {t("journal.words", { count: reflection.wordCount })}
                                    </span>
                                  </span>
                                  {preview ? (
                                    <span className="truncate text-meta text-ink-muted">
                                      {preview}
                                    </span>
                                  ) : null}
                                </button>
                                <IconButton
                                  label={
                                    reflection.favorite
                                      ? t("journal.favoriteRemove")
                                      : t("journal.favoriteAdd")
                                  }
                                  aria-pressed={reflection.favorite}
                                  onClick={() =>
                                    void setReflectionFavorite(
                                      reflection.id,
                                      !reflection.favorite,
                                    )
                                  }
                                  className={reflection.favorite ? "text-accent" : undefined}
                                >
                                  {reflection.favorite ? (
                                    <IconStarFilled size={18} />
                                  ) : (
                                    <IconStar size={18} />
                                  )}
                                </IconButton>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Panel>

      <JournalDetailSheet
        reflection={detail}
        onClose={() => setDetailId(null)}
        onEdit={(reflection) => {
          setSelected(reflection.date);
          setDetailId(null);
        }}
        onDelete={(reflection) => {
          setDetailId(null);
          setDeleteId(reflection.id);
        }}
      />

      <ConfirmSheet
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={t("journal.delete")}
        description={t("journal.deleteConfirm")}
        confirmLabel={t("common.delete")}
        tone="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
