import type {
  BlockInstance,
  BlockTemplate,
  Category,
  CustomTemplate,
  Reflection,
  Settings,
  ShiftEvent,
  StabiloPrefs,
  TemplateSwitchEvent,
} from "./types";

/**
 * Sync between devices (PC ↔ Android), as pure functions.
 *
 * The model is local-first. IndexedDB stays the source of truth on every device
 * and the app works fully offline and fully logged out. Signing in only adds a
 * shared copy on a server that devices reconcile against.
 *
 * Reconciliation is state-based, not log-based: every syncable thing becomes a
 * row with a content hash, and each device remembers the hash of every row it
 * last agreed on with the server (`known`). That one map answers all three
 * questions without hooking every write path in the app:
 *
 * - changed here:   local hash ≠ known hash
 * - deleted here:   in `known`, gone locally (this also catches `table.clear()`)
 * - changed there:  arrives from the server with a hash we have not seen
 *
 * Conflicts resolve last-write-wins per row on `updatedAt`. That is the right
 * grain for this data: a block, an entry, a category are each edited as a
 * whole, and two devices editing the same row in the same second is rare.
 *
 * No clock reads and no I/O here, so the whole thing is tested in node.
 */

export type SyncKind =
  | "category"
  | "template"
  | "instance"
  | "reflection"
  | "shiftEvent"
  | "switchEvent"
  | "settings"
  | "stabilo"
  | "customTemplates";

export const SYNC_KINDS: SyncKind[] = [
  "category",
  "template",
  "instance",
  "reflection",
  "shiftEvent",
  "switchEvent",
  "settings",
  "stabilo",
  "customTemplates",
];

export interface SyncRow {
  kind: SyncKind;
  id: string;
  /** `null` for a deletion. */
  data: unknown;
  /** ISO time of the change; last write wins. */
  updatedAt: string;
  deleted: boolean;
}

export interface KnownRow {
  hash: string;
  updatedAt: string;
  deleted: boolean;
}

/** `kind:id` → what this device and the server last agreed on. */
export type KnownMap = Record<string, KnownRow>;

export const rowKey = (kind: SyncKind, id: string) => `${kind}:${id}`;

/**
 * Settings that belong to the person and travel between devices: the plan's
 * shape, and how far through the first run they are. Everything else (theme,
 * language, motion, width, notification switches) is about one screen and one
 * OS, and syncing it would let a phone restyle a PC.
 */
export const SYNCED_SETTINGS = [
  "weekStart",
  "dayStart",
  "dayEnd",
  "activeTemplateId",
  "onboardingCompleted",
  "tourCompleted",
] as const;
export type SyncedSettings = Pick<Settings, (typeof SYNCED_SETTINGS)[number]>;

/**
 * Same idea for Stabilo: the name she calls you by, her temperament, and where
 * you are with her — the introduction, the tour and its checkpoint, the last
 * greeting — so a second device does not start the story over.
 */
export const SYNCED_STABILO = [
  "nickname",
  "intensity",
  "introSeen",
  "tourDone",
  "ph3Seen",
  "progress",
  "dailyGreeting",
  "lastGreetingDate",
] as const;
export type SyncedStabilo = Pick<StabiloPrefs, (typeof SYNCED_STABILO)[number]>;

/**
 * Applies another device's settings row on top of this device's settings.
 *
 * Progress only moves forward. The row is last-write-wins, so a fresh install
 * that has not finished onboarding yet can win a round with "not done" — and a
 * plain overwrite would then send a finished device back to the first-run
 * screens. Fields an older build did not send are left as they are.
 */
export function mergeSyncedSettings(local: Settings, remote: Partial<SyncedSettings>): Settings {
  return {
    ...local,
    ...(remote.weekStart !== undefined && { weekStart: remote.weekStart }),
    ...(remote.dayStart !== undefined && { dayStart: remote.dayStart }),
    ...(remote.dayEnd !== undefined && { dayEnd: remote.dayEnd }),
    ...(remote.activeTemplateId !== undefined && { activeTemplateId: remote.activeTemplateId }),
    onboardingCompleted: local.onboardingCompleted || remote.onboardingCompleted === true,
    tourCompleted: local.tourCompleted || remote.tourCompleted === true,
  };
}

/** The Stabilo counterpart: preferences follow the row, progress never goes back. */
export function mergeSyncedStabilo(local: StabiloPrefs, remote: Partial<SyncedStabilo>): StabiloPrefs {
  const tourDone = local.tourDone || remote.tourDone === true;
  const lastGreetingDate =
    [local.lastGreetingDate, remote.lastGreetingDate ?? null]
      .filter((value): value is string => typeof value === "string")
      .sort()
      .at(-1) ?? null;
  return {
    ...local,
    ...(remote.nickname !== undefined && { nickname: remote.nickname }),
    ...(remote.intensity !== undefined && { intensity: remote.intensity }),
    ...(remote.dailyGreeting !== undefined && { dailyGreeting: remote.dailyGreeting }),
    introSeen: local.introSeen || remote.introSeen === true,
    tourDone,
    ph3Seen: Math.max(local.ph3Seen, remote.ph3Seen ?? 0),
    // A finished tour has no checkpoint. Otherwise the newer row's checkpoint
    // wins, and a row without one never erases the one kept here.
    progress: tourDone ? null : (remote.progress ?? local.progress),
    lastGreetingDate,
  };
}

/** Stable JSON: object keys sorted, so equal data always hashes the same. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

/** FNV-1a, 32-bit. A change detector, not a security primitive. */
export function hashOf(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export interface SyncableState {
  categories: Category[];
  templates: BlockTemplate[];
  instances: BlockInstance[];
  reflections: Reflection[];
  shiftEvents: ShiftEvent[];
  switchEvents: TemplateSwitchEvent[];
  settings: Settings;
  stabilo: StabiloPrefs;
  customTemplates: CustomTemplate[];
}

function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) out[key] = source[key];
  return out;
}

/** A row's data without its timestamp, so the hash only changes with content. */
function contentOf(data: unknown): unknown {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const { updatedAt: _ignored, ...rest } = data as Record<string, unknown>;
    void _ignored;
    return rest;
  }
  return data;
}

/**
 * Flattens the app state into rows. The three single-value kinds (settings,
 * Stabilo, saved templates) have no `updatedAt` of their own; `metaStamp`
 * supplies one, and the hash decides whether they actually changed.
 */
export function toSyncRows(state: SyncableState, metaStamp: string): SyncRow[] {
  const rows: SyncRow[] = [];
  const entity = (kind: SyncKind, items: Array<{ id: string; updatedAt: string }>) => {
    for (const item of items) {
      rows.push({ kind, id: item.id, data: item, updatedAt: item.updatedAt, deleted: false });
    }
  };
  entity("category", state.categories);
  entity("template", state.templates);
  entity("instance", state.instances);
  entity("reflection", state.reflections);
  entity("shiftEvent", state.shiftEvents);
  entity("switchEvent", state.switchEvents);
  rows.push({
    kind: "settings",
    id: "settings",
    data: pick(state.settings, SYNCED_SETTINGS),
    updatedAt: metaStamp,
    deleted: false,
  });
  rows.push({
    kind: "stabilo",
    id: "stabilo",
    data: pick(state.stabilo, SYNCED_STABILO),
    updatedAt: metaStamp,
    deleted: false,
  });
  rows.push({
    kind: "customTemplates",
    id: "customTemplates",
    data: state.customTemplates,
    updatedAt: metaStamp,
    deleted: false,
  });
  return rows;
}

export function rowHash(row: Pick<SyncRow, "data" | "deleted">): string {
  return row.deleted ? "deleted" : hashOf(contentOf(row.data));
}

export interface SyncPlan {
  /** Remote rows that win and must be written locally (upserts and deletions). */
  apply: SyncRow[];
  /** Local rows the server has not seen yet (upserts and deletions). */
  push: SyncRow[];
  /** The agreement after both sides are done. */
  known: KnownMap;
}

/**
 * One reconciliation step.
 *
 * `remote` is whatever the server returned since the last pull (or everything,
 * the first time); rows the server did not mention are assumed unchanged
 * there. `now` stamps local deletions and changed single-value rows.
 */
export function planSync({
  local,
  remote,
  known,
  now,
}: {
  local: SyncRow[];
  remote: SyncRow[];
  known: KnownMap;
  now: string;
}): SyncPlan {
  const next: KnownMap = { ...known };
  const apply: SyncRow[] = [];
  const push: SyncRow[] = [];

  const localByKey = new Map(local.map((row) => [rowKey(row.kind, row.id), row]));
  const remoteByKey = new Map<string, SyncRow>();
  for (const row of remote) {
    const key = rowKey(row.kind, row.id);
    const seen = remoteByKey.get(key);
    if (!seen || seen.updatedAt <= row.updatedAt) remoteByKey.set(key, row);
  }

  // 1. What changed on this device since the last agreement.
  const localChanges = new Map<string, SyncRow>();
  for (const [key, row] of localByKey) {
    const hash = rowHash(row);
    const agreed = known[key];
    if (agreed && !agreed.deleted && agreed.hash === hash) continue;
    // A single-value row has no clock of its own: a real edit gets "now".
    const stamped =
      row.kind === "settings" || row.kind === "stabilo" || row.kind === "customTemplates"
        ? { ...row, updatedAt: now }
        : row;
    localChanges.set(key, stamped);
  }
  for (const [key, agreed] of Object.entries(known)) {
    if (agreed.deleted || localByKey.has(key)) continue;
    const [kind, ...rest] = key.split(":");
    localChanges.set(key, {
      kind: kind as SyncKind,
      id: rest.join(":"),
      data: null,
      updatedAt: now,
      deleted: true,
    });
  }

  // 2. Every remote change is either applied here or beaten by a newer local one.
  for (const [key, row] of remoteByKey) {
    const mine = localChanges.get(key);
    const remoteHash = rowHash(row);
    if (mine) {
      // Same content on both sides: nothing to do but agree.
      if (rowHash(mine) === remoteHash) {
        localChanges.delete(key);
        next[key] = { hash: remoteHash, updatedAt: row.updatedAt, deleted: row.deleted };
        continue;
      }
      if (mine.updatedAt > row.updatedAt) continue; // local wins; pushed below
      localChanges.delete(key);
    } else {
      const current = localByKey.get(key);
      if (current && rowHash(current) === remoteHash) {
        next[key] = { hash: remoteHash, updatedAt: row.updatedAt, deleted: row.deleted };
        continue;
      }
      if (!current && row.deleted) {
        next[key] = { hash: remoteHash, updatedAt: row.updatedAt, deleted: true };
        continue;
      }
    }
    apply.push(row);
    next[key] = { hash: remoteHash, updatedAt: row.updatedAt, deleted: row.deleted };
  }

  // 3. Whatever local change is left goes up.
  for (const [key, row] of localChanges) {
    push.push(row);
    next[key] = { hash: rowHash(row), updatedAt: row.updatedAt, deleted: row.deleted };
  }

  return { apply, push, known: next };
}

/**
 * The id a generated block gets: its template plus its date.
 *
 * Every device materialises the plan on its own. With random ids, a PC and a
 * phone would each create "Deep work on Monday" and sync would show it twice;
 * with this id both create the same row and the merge sees one block.
 */
export function generatedInstanceId(templateId: string, date: string): string {
  return `blk_${templateId}_${date}`;
}

/**
 * Generated blocks that exist twice for the same template and day: rows written
 * before ids were deterministic, merged from two devices. Returns the ids to
 * drop. The survivor is the one the user did something with (not just
 * `planned`), then the deterministic id, then the most recent edit.
 */
export function duplicateGeneratedIds(instances: readonly BlockInstance[]): string[] {
  const groups = new Map<string, BlockInstance[]>();
  for (const instance of instances) {
    if (instance.templateId === null) continue;
    // A block moved in from another day is a deliberate second copy next to
    // that day's own occurrence, not a duplicate.
    if (instance.movedFrom !== null) continue;
    const key = `${instance.templateId}|${instance.date}`;
    const group = groups.get(key);
    if (group) group.push(instance);
    else groups.set(key, [instance]);
  }

  const drop: string[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const score = (instance: BlockInstance) => {
      const touched =
        instance.status !== "planned" ||
        instance.note.trim() !== "" ||
        instance.actualSeconds > 0 ||
        instance.movedFrom !== null
          ? 2
          : 0;
      const canonical =
        instance.templateId !== null &&
        instance.id === generatedInstanceId(instance.templateId, instance.date)
          ? 1
          : 0;
      return touched + canonical;
    };
    const ordered = [...group].sort(
      (a, b) => score(b) - score(a) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
    );
    for (const loser of ordered.slice(1)) drop.push(loser.id);
  }
  return drop;
}
