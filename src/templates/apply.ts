import { SCHEMA_VERSION } from "@/domain/types";
import type { BlockTemplate, Category, Locale } from "@/domain/types";
import type { StudyTemplate } from "./types";
import { pickLocalized } from "./types";

export interface TemplateApplyInput {
  template: StudyTemplate;
  now: number;
  newId: (prefix: string) => string;
  /** Language of the copied titles. Applied content becomes the user's data. */
  locale: Locale;
}

export interface TemplateApplication {
  categories: Category[];
  blockTemplates: BlockTemplate[];
}

/** Turns a template into concrete rows. Pure, so it is trivial to test. */
export function buildFromTemplate({
  template,
  now,
  newId,
  locale,
}: TemplateApplyInput): TemplateApplication {
  const stamp = new Date(now).toISOString();

  // Category ids stay stable inside the workspace so blocks can reference them,
  // but are namespaced with the template id to avoid collisions on re-apply.
  const categoryIdMap = new Map<string, string>();

  const categories: Category[] = template.categories.map((category, index) => {
    const id = newId("cat");
    categoryIdMap.set(category.id, id);
    return {
      id,
      name: pickLocalized(category.name, locale),
      icon: category.icon,
      weeklyTargetMinutes: category.weeklyTargetMinutes,
      order: index,
      createdAt: stamp,
      updatedAt: stamp,
      schemaVersion: SCHEMA_VERSION,
    };
  });

  const blockTemplates: BlockTemplate[] = template.blocks.map((block, index) => ({
    id: newId("tpl"),
    categoryId: categoryIdMap.get(block.categoryId) ?? categories[0]?.id ?? "cat_unknown",
    title: pickLocalized(block.title, locale),
    durationMin: block.durationMin,
    days: [...block.days].sort((a, b) => a - b),
    order: index,
    plannedStart: block.plannedStart,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
    schemaVersion: SCHEMA_VERSION,
  }));

  return { categories, blockTemplates };
}
