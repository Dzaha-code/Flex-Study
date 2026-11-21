import type { BlockInstance, BlockTemplate, Category } from "./types";

/**
 * What a category is actually holding.
 *
 * Deleting a category used to remove only its own row. Every template and block
 * that pointed at it kept the id — and the period recap builds its per-category
 * figures by iterating the categories that still exist, while the block counts
 * are read straight from the instances. A finished block could therefore be
 * counted as "done" and still contribute zero minutes to the total it belongs
 * to. That is the kind of quiet inconsistency this module exists to prevent.
 */
export interface CategoryUsage {
  templates: number;
  instances: number;
  total: number;
}

export function categoryUsage(
  categoryId: string,
  templates: readonly BlockTemplate[],
  instances: readonly BlockInstance[],
): CategoryUsage {
  const templateCount = templates.filter((template) => template.categoryId === categoryId).length;
  const instanceCount = instances.filter((instance) => instance.categoryId === categoryId).length;
  return {
    templates: templateCount,
    instances: instanceCount,
    total: templateCount + instanceCount,
  };
}

/**
 * The category that inherits the rows of the one being removed.
 *
 * Lowest `order` wins, then the name, so the answer is stable and predictable
 * rather than "whichever row the store happened to list first". `null` means
 * there is nothing to move to: the last category cannot be deleted, because a
 * block without a category has nowhere to be filed.
 */
export function replacementCategory(
  categories: readonly Category[],
  removedId: string,
): Category | null {
  const rest = categories
    .filter((category) => category.id !== removedId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return rest[0] ?? null;
}

/**
 * Rewrites the rows that pointed at `fromId`, returning only the changed ones —
 * the caller persists exactly what moved.
 *
 * The input is never mutated: these rows double as undo snapshots
 * (`ShiftEvent.restoreBefore`, `TemplateSwitchEvent.previousTemplates`), and an
 * in-place edit would rewrite history that was already recorded.
 */
export function reassignCategory<T extends { categoryId: string; updatedAt: string }>(
  rows: readonly T[],
  fromId: string,
  toId: string,
  stamp: string,
): T[] {
  if (fromId === toId) return [];
  return rows
    .filter((row) => row.categoryId === fromId)
    .map((row) => ({ ...row, categoryId: toId, updatedAt: stamp }));
}
