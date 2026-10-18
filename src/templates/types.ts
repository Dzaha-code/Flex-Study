import type { CategorySymbol, CustomTemplate, Locale } from "@/domain/types";

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
  audienceKey?: string;
  categories: TemplateCategory[];
  blocks: TemplateBlock[];
}

/**
 * The saved-template entity lives in the domain because it is user data that
 * travels in an export. It is deliberately not a `StudyTemplate`: that one ships
 * in the bundle and holds two translations, while this is one person's snapshot
 * in one language.
 */
export type { CustomTemplate };

/** Adapts a saved template to the shape the apply pipeline already understands. */
export function toStudyTemplate(template: CustomTemplate): StudyTemplate {
  const categoryIds = template.categories.map((_, index) => `c${index}`);

  return {
    templateId: template.id,
    name: { id: template.name, en: template.name },
    description: { id: template.description, en: template.description },
    categories: template.categories.map((category, index) => ({
      id: categoryIds[index] ?? `c${index}`,
      name: { id: category.name, en: category.name },
      icon: category.icon,
      weeklyTargetMinutes: category.weeklyTargetMinutes,
    })),
    blocks: template.blocks
      .filter((block) => categoryIds[block.categoryIndex] !== undefined)
      .map((block) => ({
        title: { id: block.title, en: block.title },
        categoryId: categoryIds[block.categoryIndex] ?? categoryIds[0] ?? "c0",
        durationMin: block.durationMin,
        days: block.days,
        plannedStart: block.plannedStart,
      })),
  };
}

export function pickLocalized(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.id;
}
