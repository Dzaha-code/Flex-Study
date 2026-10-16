"use client";

import { useMemo } from "react";
import { addDays, durationParts, formatClock, formatCountdown, fromISODate } from "@/domain";
import type { Locale } from "@/domain/types";
import { useAppStore } from "@/data/store";
import { en } from "./messages/en";
import { id, type MessageKey, type Messages } from "./messages/id";

const DICTIONARIES: Record<Locale, Messages> = { id, en };

const INTL_TAGS: Record<Locale, string> = { id: "id-ID", en: "en-GB" };

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

export interface I18n {
  locale: Locale;
  t: Translate;
  formatDateLong: (iso: string) => string;
  formatDateShort: (iso: string) => string;
  formatWeekdayShort: (iso: string) => string;
  /** Short weekday name for a day index, 0 = Sunday. */
  formatWeekdayIndex: (index: number) => string;
  /** `"2026-10"` → "Oktober 2026". */
  formatMonthLabel: (month: string) => string;
  /** `"2026-10"` → "Oktober". Under a year heading the year would be a repeat. */
  formatMonthName: (month: string) => string;
  /** `"2026-10"` → "Okt". */
  formatMonthShort: (month: string) => string;
  formatMinutes: (minutes: number) => string;
  formatCountdownValue: (seconds: number) => string;
  formatClockValue: (minutes: number) => string;
}

/** 2026-10-11 is a Sunday, so index 0 lines up with the model's convention. */
const WEEKDAY_REFERENCE = "2026-10-11";

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) =>
    token in params ? String(params[token]) : match,
  );
}

/** Pure factory, so it can be unit tested without React. */
export function createI18n(locale: Locale): I18n {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES.id;
  const t: Translate = (key, params) => interpolate(dictionary[key] ?? key, params);

  const tag = INTL_TAGS[locale] ?? INTL_TAGS.id;
  const longDate = new Intl.DateTimeFormat(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const shortDate = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" });
  const shortWeekday = new Intl.DateTimeFormat(tag, { weekday: "short" });
  const longMonth = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" });
  const monthName = new Intl.DateTimeFormat(tag, { month: "long" });
  const shortMonth = new Intl.DateTimeFormat(tag, { month: "short" });

  return {
    locale,
    t,
    formatDateLong: (iso) => longDate.format(fromISODate(iso)),
    formatDateShort: (iso) => shortDate.format(fromISODate(iso)),
    formatWeekdayShort: (iso) => shortWeekday.format(fromISODate(iso)),
    formatWeekdayIndex: (index) =>
      shortWeekday.format(fromISODate(addDays(WEEKDAY_REFERENCE, ((index % 7) + 7) % 7))),
    // A month key is only ever a label here, so the first of the month is a safe
    // thing to format — the day is never shown.
    formatMonthLabel: (month) => longMonth.format(fromISODate(`${month}-01`)),
    formatMonthName: (month) => monthName.format(fromISODate(`${month}-01`)),
    formatMonthShort: (month) => shortMonth.format(fromISODate(`${month}-01`)),
    formatMinutes: (minutes) => {
      const { hours, minutes: rest } = durationParts(minutes);
      if (hours > 0 && rest > 0) return t("common.duration.hm", { hours, minutes: rest });
      if (hours > 0) return t("common.duration.h", { hours });
      return t("common.duration.m", { minutes: rest });
    },
    // Timers and clock times stay numeric in both languages: "01:30" reads the
    // same everywhere and never jitters.
    formatCountdownValue: formatCountdown,
    formatClockValue: formatClock,
  };
}

export function useI18n(): I18n {
  const locale = useAppStore((state) => state.settings.locale);
  return useMemo(() => createI18n(locale), [locale]);
}

export { DICTIONARIES };
export type { MessageKey, Messages };
