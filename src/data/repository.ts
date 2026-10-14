import { DEFAULT_SETTINGS } from "@/domain/types";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  Reflection,
  Settings,
  ShiftEvent,
  Workspace,
} from "@/domain/types";
import { getDatabase, isQuotaError, isStorageAvailable } from "./db";
import { SettingsSchema } from "./schema";

export type WriteOutcome =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" | "unknown" };

/** Every write goes through here, so a full quota is handled in one place. */
async function guard(operation: () => Promise<unknown>): Promise<WriteOutcome> {
  if (!isStorageAvailable()) return { ok: false, reason: "unavailable" };
  try {
    await operation();
    return { ok: true };
  } catch (error) {
    if (isQuotaError(error)) {
      console.error("[flexstudy] storage quota exceeded", error);
      return { ok: false, reason: "quota" };
    }
    console.error("[flexstudy] write failed", error);
    return { ok: false, reason: "unknown" };
  }
}

export async function loadWorkspace(): Promise<Workspace> {
  const db = getDatabase();
  const [categories, templates, instances, reflections, shiftEvents, settings] = await Promise.all([
    db.categories.toArray(),
    db.templates.toArray(),
    db.instances.toArray(),
    db.reflections.toArray(),
    db.shiftEvents.toArray(),
    readSettings(),
  ]);

  return { categories, templates, instances, reflections, shiftEvents, settings };
}

export async function readSettings(): Promise<Settings> {
  const row = await getDatabase().meta.get("settings");
  const parsed = SettingsSchema.safeParse(row?.value);
  if (!parsed.success) return { ...DEFAULT_SETTINGS };
  // Merge so a settings row written by an older build still gets new defaults.
  return { ...DEFAULT_SETTINGS, ...parsed.data };
}

export async function persistSettings(settings: Settings): Promise<WriteOutcome> {
  return guard(() => getDatabase().meta.put({ key: "settings", value: settings }));
}

export async function persistCategories(categories: Category[]): Promise<WriteOutcome> {
  return guard(() => getDatabase().categories.bulkPut(categories));
}

export async function removeCategory(id: string): Promise<WriteOutcome> {
  return guard(() => getDatabase().categories.delete(id));
}

export async function persistTemplates(templates: BlockTemplate[]): Promise<WriteOutcome> {
  return guard(() => getDatabase().templates.bulkPut(templates));
}

export async function removeTemplate(id: string): Promise<WriteOutcome> {
  return guard(() => getDatabase().templates.delete(id));
}

export async function persistInstances(instances: BlockInstance[]): Promise<WriteOutcome> {
  if (instances.length === 0) return { ok: true };
  return guard(() => getDatabase().instances.bulkPut(instances));
}

export async function removeInstances(ids: string[]): Promise<WriteOutcome> {
  if (ids.length === 0) return { ok: true };
  return guard(() => getDatabase().instances.bulkDelete(ids));
}

export async function persistReflection(reflection: Reflection): Promise<WriteOutcome> {
  return guard(() => getDatabase().reflections.put(reflection));
}

export async function persistShiftEvent(event: ShiftEvent): Promise<WriteOutcome> {
  return guard(() => getDatabase().shiftEvents.put(event));
}

/**
 * Drops generated-but-untouched blocks after a given day, so editing the plan
 * never erases something the user already acted on.
 */
export async function deleteUntouchedInstancesAfter(date: string): Promise<WriteOutcome> {
  return guard(async () => {
    const db = getDatabase();
    const keys = await db.instances
      .where("date")
      .above(date)
      .filter(
        (instance) =>
          instance.status === "planned" &&
          instance.actualSeconds === 0 &&
          instance.note.trim() === "" &&
          instance.movedFrom === null,
      )
      .primaryKeys();
    if (keys.length > 0) await db.instances.bulkDelete(keys);
  });
}

/** Used by import and by applying a template: one atomic replacement. */
export async function replaceAll(workspace: Workspace): Promise<WriteOutcome> {
  const db = getDatabase();
  return guard(() =>
    db.transaction(
      "rw",
      [db.categories, db.templates, db.instances, db.reflections, db.shiftEvents, db.meta],
      async () => {
        await Promise.all([
          db.categories.clear(),
          db.templates.clear(),
          db.instances.clear(),
          db.reflections.clear(),
          db.shiftEvents.clear(),
        ]);
        await db.categories.bulkPut(workspace.categories);
        await db.templates.bulkPut(workspace.templates);
        await db.instances.bulkPut(workspace.instances);
        await db.reflections.bulkPut(workspace.reflections);
        await db.shiftEvents.bulkPut(workspace.shiftEvents);
        await db.meta.put({ key: "settings", value: workspace.settings });
      },
    ),
  );
}

export async function clearWorkspace(): Promise<WriteOutcome> {
  const db = getDatabase();
  return guard(() =>
    db.transaction(
      "rw",
      [db.categories, db.templates, db.instances, db.reflections, db.shiftEvents, db.meta],
      async () => {
        await Promise.all([
          db.categories.clear(),
          db.templates.clear(),
          db.instances.clear(),
          db.reflections.clear(),
          db.shiftEvents.clear(),
          db.meta.clear(),
        ]);
      },
    ),
  );
}

/** Rough usage figure for the data section of settings. */
export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
