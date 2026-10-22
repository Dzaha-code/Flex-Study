import Dexie, { type Table } from "dexie";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  Reflection,
  ShiftEvent,
  TemplateSwitchEvent,
} from "@/domain/types";

export interface MetaRow {
  key: string;
  value: unknown;
}

/**
 * IndexedDB is the primary store: it holds structured records and much more
 * room than `localStorage`, and it is the shape a later sync layer can diff.
 *
 * Note that Dexie's `version(n)` is the *storage* schema (indexes), while every
 * row also carries its own `schemaVersion` for data migration.
 */
export class FlexStudyDatabase extends Dexie {
  categories!: Table<Category, string>;
  templates!: Table<BlockTemplate, string>;
  instances!: Table<BlockInstance, string>;
  reflections!: Table<Reflection, string>;
  shiftEvents!: Table<ShiftEvent, string>;
  /**
   * Added inside the existing version 1 rather than as a new version: a table
   * with the same index shape as `shiftEvents` needs no backfill, and Dexie
   * creates missing stores on upgrade without touching the rows already there.
   */
  switchEvents!: Table<TemplateSwitchEvent, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("flexstudy");
    this.version(1).stores({
      categories: "id, order",
      templates: "id, categoryId, order",
      instances: "id, date, status, categoryId, templateId",
      reflections: "id, date",
      shiftEvents: "id, date",
      switchEvents: "id, date",
      meta: "key",
    });
  }
}

let database: FlexStudyDatabase | null = null;

/** Created lazily so importing this module never touches `indexedDB`. */
export function getDatabase(): FlexStudyDatabase {
  if (!database) database = new FlexStudyDatabase();
  return database;
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "QuotaExceededError";
  }
  return error instanceof Error && /quota/i.test(error.name + error.message);
}
