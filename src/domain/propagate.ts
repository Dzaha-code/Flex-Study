import type { BlockInstance, BlockTemplate } from "./types";

/**
 * A block is "untouched" while nothing the user did is attached to it: it is
 * still only planned, no time has been banked, no note written, and it has not
 * been moved to or from another day.
 *
 * This is the single definition of that idea. It is what decides both which
 * generated blocks may be dropped when the plan changes, and which blocks an
 * edit is allowed to rewrite. Keeping one predicate means an edit can never
 * erase work that the drop rule would have preserved.
 */
export function isUntouchedInstance(instance: BlockInstance): boolean {
  return (
    instance.status === "planned" &&
    instance.actualSeconds === 0 &&
    instance.startedAt === null &&
    instance.note.trim() === "" &&
    instance.movedFrom === null &&
    instance.movedTo === null
  );
}

/**
 * Rewrites the untouched blocks of a template on or before `throughDate`.
 *
 * Blocks store their own copy of the title, duration, category and start, so
 * editing the template alone leaves every existing day showing the old text —
 * a corrected typo would still be wrong on today's timeline. Future days are
 * left alone here: they are dropped and regenerated from the template, which
 * also picks up newly added weekdays.
 *
 * `throughDate` is an ISO date; ISO dates compare correctly as strings.
 */
export function propagateTemplateEdit(
  instances: BlockInstance[],
  template: BlockTemplate,
  updatedAt: string,
  throughDate: string,
): BlockInstance[] {
  return instances
    .filter(
      (instance) =>
        instance.templateId === template.id &&
        instance.date <= throughDate &&
        isUntouchedInstance(instance),
    )
    .map((instance) => ({
      ...instance,
      categoryId: template.categoryId,
      title: template.title,
      durationMin: template.durationMin,
      plannedStart: template.plannedStart,
      order: template.order,
      updatedAt,
    }));
}

export type EditTarget =
  | { kind: "template"; template: BlockTemplate }
  | { kind: "instance"; instance: BlockInstance };

/**
 * Decides which definition an edit made from the timeline has to change.
 *
 * A block generated from a template must be edited at the template: changing
 * only the occurrence would be undone the next time the day is materialised.
 * A block the user added by hand has no template behind it, so it is edited on
 * its own.
 */
export function resolveEditTarget(
  instance: BlockInstance,
  templates: BlockTemplate[],
): EditTarget {
  if (instance.templateId !== null) {
    const template = templates.find((row) => row.id === instance.templateId);
    if (template) return { kind: "template", template };
  }
  return { kind: "instance", instance };
}

/**
 * The ids of untouched blocks whose template no longer exists.
 *
 * Deleting a block has to take its pending occurrences with it, or the block
 * keeps showing up on today's timeline forever, pointing at a template that is
 * gone. Occurrences the user already worked on are kept as history.
 */
export function orphanedInstanceIds(
  instances: BlockInstance[],
  removedTemplateIds: string[],
  throughDate: string,
): string[] {
  const removed = new Set(removedTemplateIds);
  return instances
    .filter(
      (instance) =>
        instance.templateId !== null &&
        removed.has(instance.templateId) &&
        instance.date <= throughDate &&
        isUntouchedInstance(instance),
    )
    .map((instance) => instance.id);
}
