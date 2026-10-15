import type { CategorySymbol, Locale } from "@/domain/types";

/**
 * Templates are data. The core system knows nothing about UTBK or PKL — it only
 * sees categories, blocks and durations.
 */

export interface LocalizedText {
  id: string;
  en: string;
}

export interface TemplateCategory {
  id: string;
  name: LocalizedText;
  icon: CategorySymbol;
  weeklyTargetMinutes: number;
}

export interface TemplateBlock {
  title: LocalizedText;
  categoryId: string;
  durationMin: number;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  plannedStart: string | null;
}

export interface StudyTemplate {
  templateId: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Message key shown as the template's "who is this for" line. */
  audienceKey: string;
  categories: TemplateCategory[];
  blocks: TemplateBlock[];
}

export function pickLocalized(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.id;
}
