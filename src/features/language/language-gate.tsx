"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/data/store";
import type { Locale } from "@/domain/types";
import { useI18n } from "@/i18n";
import { LOCALE_STORAGE_KEY } from "@/lib/preferences";

/**
 * The first screen, before anything else — including the opening animation and
 * the database. The tour script is written per language, so the language has to
 * exist before the first word is spoken.
 *
 * It deliberately waits for hydration before handing over: writing the mirror
 * alone would let the store's default (`id`) win a moment later, and the
 * introduction would switch language halfway through its first sentence.
 */
export function LanguageGate({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const status = useAppStore((state) => state.status);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [chosen, setChosen] = useState<Locale | null>(null);

  useEffect(() => {
    if (!chosen || status !== "ready") return;
    void updateSettings({ locale: chosen }).then(onDone);
  }, [chosen, status, updateSettings, onDone]);

  function choose(locale: Locale) {
    setChosen(locale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* Storage blocked: the store still gets the choice once it is ready. */
    }
    document.documentElement.lang = locale;
  }

  const busy = chosen !== null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <p className="text-label font-medium text-accent">{t("app.name")}</p>
        <h1 className="text-display">{t("language.title")}</h1>
        <p className="measure text-meta text-ink-muted">{t("language.subtitle")}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button
          size="lg"
          autoFocus
          disabled={busy}
          onClick={() => choose("id")}
          lang="id"
        >
          {t("language.indonesian")}
        </Button>
        <Button size="lg" variant="secondary" disabled={busy} onClick={() => choose("en")} lang="en">
          {t("language.english")}
        </Button>
      </div>

      <p className="text-caption text-mute" role="status">
        {busy ? t("common.loading") : ""}
      </p>
    </div>
  );
}
