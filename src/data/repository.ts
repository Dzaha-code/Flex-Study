import { DEFAULT_SETTINGS, DEFAULT_STABILO_PREFS } from "@/domain/types";
import type { StabiloPrefs } from "@/domain/types";
import { isUntouchedInstance } from "@/domain/propagate";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  CustomTemplate,
  JournalSection,
  Reflection,
  Settings,
  ShiftEvent,
  TemplateSwitchEvent,
  Workspace,
} from "@/domain/types";
import { getDatabase, isQuotaError, isStorageAvailable } from "./db";
import { customTemplatesSchema, SettingsSchema, StabiloPrefsSchema } from "./schema";

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
  const [
    categories,
    templates,
    instances,
    reflections,
    shiftEvents,
    switchEvents,
    journalSections,
    settings,
    stabilo,
    customTemplates,
  ] = await Promise.all([
    db.categories.toArray(),
    db.templates.toArray(),
    db.instances.toArray(),
    db.reflections.toArray(),
    db.shiftEvents.toArray(),
    db.switchEvents.toArray(),
    db.journalSections.toArray(),
    readSettings(),
    readStabilo(),
    readCustomTemplates(),
  ]);

  return {
    categories,
    templates,
    instances,
    reflections,
    shiftEvents,
    switchEvents,
    journalSections,
    settings,
    stabilo,
    customTemplates,
  };
}

/**
 * Saved templates live in the same `meta` row space as settings and Stabilo's
 * preferences. A corrupt row returns an empty list: losing a shortcut is
 * recoverable, failing the boot is not.
 */
export async function readCustomTemplates(): Promise<CustomTemplate[]> {
  try {
    const row = await getDatabase().meta.get("customTemplates");
    const parsed = customTemplatesSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function persistCustomTemplates(
  templates: CustomTemplate[],
): Promise<WriteOutcome> {
  return guard(() => getDatabase().meta.put({ key: "customTemplates", value: templates }));
}

/**
 * Stabilo's row shares the `meta` table with settings, so no Dexie version bump
 * is needed. A missing or unreadable row means "defaults", never an error: the
 * character is decoration, and a corrupt pref must not block the app.
 */
export async function readStabilo(): Promise<StabiloPrefs> {
  try {
    const row = await getDatabase().meta.get("stabilo");
    const parsed = StabiloPrefsSchema.safeParse(row?.value);
    if (!parsed.success) return { ...DEFAULT_STABILO_PREFS };
    return { ...DEFAULT_STABILO_PREFS, ...parsed.data };
  } catch {
    return { ...DEFAULT_STABILO_PREFS };
  }
}

export async function persistStabilo(prefs: StabiloPrefs): Promise<WriteOutcome> {
  return guard(() => getDatabase().meta.put({ key: "stabilo", value: prefs }));
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

export async function persistReflections(reflections: Reflection[]): Promise<WriteOutcome> {
  if (reflections.length === 0) return { ok: true };
  return guard(() => getDatabase().reflections.bulkPut(reflections));
}

export async function persistJournalSections(sections: JournalSection[]): Promise<WriteOutcome> {
  if (sections.length === 0) return { ok: true };
  return guard(() => getDatabase().journalSections.bulkPut(sections));
}

export async function removeJournalSection(id: string): Promise<WriteOutcome> {
  return guard(() => getDatabase().journalSections.delete(id));
}

export async function removeReflection(id: string): Promise<WriteOutcome> {
  return guard(() => getDatabase().reflections.delete(id));
}

export async function persistShiftEvent(event: ShiftEvent): Promise<WriteOutcome> {
  return guard(() => getDatabase().shiftEvents.put(event));
}

export async function persistSwitchEvent(event: TemplateSwitchEvent): Promise<WriteOutcome> {
  return guard(() => getDatabase().switchEvents.put(event));
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
      // Only generated rows come back through ensureRange. A one-off block
      // added by hand has no template to be regenerated from, so it stays.
      .filter((instance) => instance.templateId !== null && isUntouchedInstance(instance))
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
      [
        db.categories,
        db.templates,
        db.instances,
        db.reflections,
        db.shiftEvents,
        db.switchEvents,
        db.meta,
      ],
      async () => {
        await Promise.all([
          db.categories.clear(),
          db.templates.clear(),
          db.instances.clear(),
          db.reflections.clear(),
          db.shiftEvents.clear(),
          db.switchEvents.clear(),
        ]);
        await db.categories.bulkPut(workspace.categories);
        await db.templates.bulkPut(workspace.templates);
        await db.instances.bulkPut(workspace.instances);
        await db.reflections.bulkPut(workspace.reflections);
        await db.shiftEvents.bulkPut(workspace.shiftEvents);
        // Absent in an older export: the table stays empty with the rest of
        // the replaced rows, because a kept event would undo into instances
        // that no longer exist. Applies always carry their log explicitly.
        if (workspace.switchEvents) {
          await db.switchEvents.bulkPut(workspace.switchEvents);
        }
        // Journal sections are not cleared with the rest: an older export has
        // none, and wiping the table would strand every entry the import just
        // restored at a section id nothing holds. Only an export that carries
        // its sections replaces them.
        if (workspace.journalSections) {
          await db.journalSections.clear();
          await db.journalSections.bulkPut(workspace.journalSections);
        }
        await db.meta.put({ key: "settings", value: workspace.settings });
        // An older export has no `stabilo` key; writing defaults there would
        // silently erase the nickname this device already had.
        if (workspace.stabilo) {
          await db.meta.put({ key: "stabilo", value: workspace.stabilo });
        }
        if (workspace.customTemplates) {
          await db.meta.put({ key: "customTemplates", value: workspace.customTemplates });
        }
      },
    ),
  );
}

export async function clearWorkspace(): Promise<WriteOutcome> {
  const db = getDatabase();
  return guard(() =>
    db.transaction(
      "rw",
      [
        db.categories,
        db.templates,
        db.instances,
        db.reflections,
        db.shiftEvents,
        db.switchEvents,
        db.meta,
      ],
      async () => {
        await Promise.all([
          db.categories.clear(),
          db.templates.clear(),
          db.instances.clear(),
          db.reflections.clear(),
          db.shiftEvents.clear(),
          db.switchEvents.clear(),
          db.journalSections.clear(),
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

/** One batch of rows that arrived from another device. */
export interface SyncBatch {
  categories: { put: Category[]; remove: string[] };
  templates: { put: BlockTemplate[]; remove: string[] };
  instances: { put: BlockInstance[]; remove: string[] };
  reflections: { put: Reflection[]; remove: string[] };
  shiftEvents: { put: ShiftEvent[]; remove: string[] };
  switchEvents: { put: TemplateSwitchEvent[]; remove: string[] };
  settings: Settings | null;
  stabilo: StabiloPrefs | null;
  customTemplates: CustomTemplate[] | null;
}

/**
 * Writes a sync batch in one transaction: a sync interrupted halfway must not
 * leave a template without its category, or blocks pointing at neither.
 */
export async function applySyncBatch(batch: SyncBatch): Promise<WriteOutcome> {
  const db = getDatabase();
  return guard(() =>
    db.transaction(
      "rw",
      [
        db.categories,
        db.templates,
        db.instances,
        db.reflections,
        db.shiftEvents,
        db.switchEvents,
        db.meta,
      ],
      async () => {
        const pairs = [
          [db.categories, batch.categories],
          [db.templates, batch.templates],
          [db.instances, batch.instances],
          [db.reflections, batch.reflections],
          [db.shiftEvents, batch.shiftEvents],
          [db.switchEvents, batch.switchEvents],
        ] as const;
        for (const [table, change] of pairs) {
          if (change.put.length > 0) await (table as typeof db.categories).bulkPut(change.put as never);
          if (change.remove.length > 0) await table.bulkDelete(change.remove);
        }
        if (batch.settings) await db.meta.put({ key: "settings", value: batch.settings });
        if (batch.stabilo) await db.meta.put({ key: "stabilo", value: batch.stabilo });
        if (batch.customTemplates) {
          await db.meta.put({ key: "customTemplates", value: batch.customTemplates });
        }
      },
    ),
  );
}
