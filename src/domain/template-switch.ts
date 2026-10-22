import { SCHEMA_VERSION } from "./types";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  ISODate,
  TemplateSwitchEvent,
} from "./types";

/**
 * Switching the active template (updateBrief.md §3.5).
 *
 * The old behaviour replaced every untouched future block the moment a
 * different template was picked, with one warning and no way back — which is
 * why a tester's "Hari ini" never appeared to change: today's blocks were
 * already materialised, and the apply only filled days that were empty.
 *
 * This module is the replacement's brain, in three pure pieces:
 *
 * 1. `planTemplateSwitch` decides what may be replaced and what must survive.
 *    Only `planned` blocks from the start day onward that carry nothing of the
 *    user's own — no note, no measured time, not moved in by hand — are
 *    replaceable. Everything else is history and is never touched; days before
 *    the start day are never touched either.
 * 2. The same plan is the preview: what the user reads before confirming is the
 *    exact list the apply consumes, so the preview cannot lie.
 * 3. `TemplateSwitchEvent` is the undo record, same shape as `ShiftEvent`:
 *    copies of what was removed plus the ids of what was created.
 *
 * Time is injected; nothing here reads the clock.
 */

/**
 * A block the switch is allowed to replace.
 *
 * The rules are deliberately conservative in one direction only: it is always
 * safe to *keep* a block, and never safe to delete something the user worked
 * on. A block moved in from another day (`movedFrom`) also stays — moving it
 * was a decision, and a template switch must not overrule it.
 */
export function isReplaceableBySwitch(
  instance: BlockInstance,
  startDate: ISODate,
): boolean {
  if (instance.date < startDate) return false;
  if (instance.status !== "planned") return false;
  if (instance.note.trim() !== "") return false;
  if (instance.actualSeconds > 0) return false;
  return instance.movedFrom === null;
}

/** Why the kept blocks survived, for the preview line. One count per reason. */
export interface TemplateSwitchKept {
  total: number;
  done: number;
  running: number;
  /** Planned, but carrying a note. */
  noted: number;
  /** Planned, but with measured time on it. */
  measured: number;
  /** Skipped, deferred, or kept for a reason the preview does not name. */
  other: number;
}

export interface TemplateSwitchPlan {
  /** The first day the new plan takes over. */
  startDate: ISODate;
  /** The ids the apply will remove — the very list the preview shows. */
  replacedIds: string[];
  /** Full copies of the same rows, kept for the undo record. */
  restoreBefore: BlockInstance[];
  kept: TemplateSwitchKept;
}

export interface TemplateSwitchPlanInput {
  instances: readonly BlockInstance[];
  /** First day the new plan applies to. Today, tomorrow, or next Monday. */
  startDate: ISODate;
}

/** Counts each kept block by the first reason that applies, so nothing is double-counted. */
function tallyKept(instance: BlockInstance, kept: TemplateSwitchKept): void {
  kept.total += 1;
  if (instance.status === "done") kept.done += 1;
  else if (instance.status === "running") kept.running += 1;
  else if (instance.note.trim() !== "") kept.noted += 1;
  else if (instance.actualSeconds > 0) kept.measured += 1;
  else kept.other += 1;
}

export function planTemplateSwitch(input: TemplateSwitchPlanInput): TemplateSwitchPlan {
  const replacedIds: string[] = [];
  const restoreBefore: BlockInstance[] = [];
  const kept: TemplateSwitchKept = {
    total: 0,
    done: 0,
    running: 0,
    noted: 0,
    measured: 0,
    other: 0,
  };

  for (const instance of input.instances) {
    if (isReplaceableBySwitch(instance, input.startDate)) {
      replacedIds.push(instance.id);
      restoreBefore.push({ ...instance });
    } else if (instance.date >= input.startDate) {
      tallyKept(instance, kept);
    }
  }

  return { startDate: input.startDate, replacedIds, restoreBefore, kept };
}

export interface TemplateSwitchEventInput {
  plan: TemplateSwitchPlan;
  /** The active template before this switch, so undo can name it again. */
  previousTemplateId: string | null;
  /**
   * The block templates and categories the apply is about to replace, copied
   * verbatim: undo puts these rows back exactly, so a restored instance never
   * dangles — neither its plan reference nor its category name.
   */
  previousTemplates: readonly BlockTemplate[];
  previousCategories: readonly Category[];
  now: number;
  newId: (prefix: string) => string;
}

/** An auditable record of the switch, and the record undo works from. */
export function makeTemplateSwitchEvent(input: TemplateSwitchEventInput): TemplateSwitchEvent {
  const stamp = new Date(input.now).toISOString();
  return {
    id: input.newId("tsw"),
    date: input.plan.startDate,
    previousTemplateId: input.previousTemplateId,
    replacedIds: [...input.plan.replacedIds],
    restoreBefore: input.plan.restoreBefore.map((instance) => ({ ...instance })),
    createdInstanceIds: [],
    previousTemplates: input.previousTemplates.map((template) => ({ ...template })),
    previousCategories: input.previousCategories.map((category) => ({ ...category })),
    undone: false,
    createdAt: stamp,
    updatedAt: stamp,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Records what the apply created, after the fact: the new day rows only exist
 * once `ensureRange` has run, and undo has to remove exactly those.
 */
export function withCreatedInstances(
  event: TemplateSwitchEvent,
  createdInstanceIds: string[],
  now: number,
): TemplateSwitchEvent {
  return {
    ...event,
    createdInstanceIds: [...createdInstanceIds],
    updatedAt: new Date(now).toISOString(),
  };
}

export interface TemplateSwitchUndo {
  upserts: BlockInstance[];
  deletes: string[];
  /** The plan as it was: the apply replaced these wholesale, so undo does too. */
  templates: BlockTemplate[];
  categories: Category[];
}

/**
 * Undo reverses the *whole* apply, not just its rows: the removed instances
 * come back, the created ones go, and the previous plan's templates and
 * categories are restored — anything less leaves history pointing at ids that
 * exist nowhere. Idempotence is the caller's to enforce (the event carries
 * `undone`), mirroring the shift log.
 */
export function undoTemplateSwitch(event: TemplateSwitchEvent): TemplateSwitchUndo {
  return {
    upserts: event.restoreBefore.map((instance) => ({ ...instance })),
    deletes: [...event.createdInstanceIds],
    templates: event.previousTemplates.map((template) => ({ ...template })),
    categories: event.previousCategories.map((category) => ({ ...category })),
  };
}
