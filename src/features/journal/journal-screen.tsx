"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { IconDownload, IconPlus } from "@/components/ui/icons";
import { Chip, EmptyState, Panel, PanelHeader } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import {
  countWords,
  hasContent,
  LEARNING_SLOTS,
  normalizeLearnings,
  promptIdForDate,
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

  const [body, setBody] = useState(existing?.body ?? "");
  const [learnings, setLearnings] = useState<string[]>(
    normalizeLearnings(existing?.learnings ?? []),
  );

  const wordCount = useMemo(() => countWords(body), [body]);
  const filled = hasContent({ body, learnings });

  // Save automatically, but never create an empty entry just by opening the page.
  useEffect(() => {
    if (!hasContent({ body, learnings })) return;
    const timer = setTimeout(() => {
      void saveReflection({ date, body, learnings, promptId });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [body, learnings, date, promptId, saveReflection]);

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

export function JournalScreen() {
  const reflections = useAppStore((state) => state.reflections);
  const { t, formatDateLong } = useI18n();

  const [today] = useState(() => todayISO(Date.now()));
  const [selected, setSelected] = useState(today);

  const existing = reflections.find((reflection) => reflection.date === selected) ?? null;
  const promptId = existing?.promptId ?? promptIdForDate(selected);
  const ordered = [...reflections].sort((a, b) => b.date.localeCompare(a.date));

  function handleExport() {
    if (reflections.length === 0) return;
    const markdown = reflectionsToMarkdown(reflections, {
      title: t("journal.title"),
      learnings: t("journal.learningsLabel"),
    });
    downloadTextFile(`${today}-flexstudy-journal.md`, markdown, "text/markdown");
    toastManager.add({ title: t("journal.exported"), timeout: 4_000 });
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
        <JournalEditor key={selected} date={selected} existing={existing} promptId={promptId} />
      </Panel>

      <Panel data-tour="journal-history">
        <PanelHeader title={t("journal.history")} />
        {ordered.length === 0 ? (
          <EmptyState
            title={t("journal.empty.title")}
            body={t("journal.empty.body")}
            action={<Button onClick={() => setSelected(today)}>{t("journal.empty.cta")}</Button>}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {ordered.map((reflection) => (
              <li key={reflection.id}>
                <button
                  type="button"
                  onClick={() => setSelected(reflection.date)}
                  className="flex w-full flex-col gap-1 py-3 text-left hover:bg-accent-surface/40"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "text-body",
                        reflection.date === selected && "font-medium text-accent",
                      )}
                    >
                      {formatDateLong(reflection.date)}
                    </span>
                    <span className="text-label text-ink-muted">
                      {t("journal.words", { count: reflection.wordCount })}
                    </span>
                  </span>
                  <span className="truncate text-meta text-ink-muted">
                    {reflectionPreview(reflection.body) ||
                      reflection.learnings.filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
