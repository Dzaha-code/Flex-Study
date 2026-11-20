import { describe, expect, it } from "vitest";
import {
  duplicateGeneratedIds,
  generatedInstanceId,
  hashOf,
  planSync,
  rowHash,
  rowKey,
  toSyncRows,
  type KnownMap,
  type SyncRow,
  type SyncableState,
} from "@/domain/sync";
import { DEFAULT_STABILO_PREFS } from "@/domain/types";
import { baseSettings, makeInstance } from "./helpers";

const NOW = "2026-11-20T10:00:00.000Z";

function state(partial: Partial<SyncableState> = {}): SyncableState {
  return {
    categories: [],
    templates: [],
    instances: [],
    reflections: [],
    shiftEvents: [],
    switchEvents: [],
    settings: baseSettings,
    stabilo: DEFAULT_STABILO_PREFS,
    customTemplates: [],
    ...partial,
  };
}

function agreeOn(rows: SyncRow[]): KnownMap {
  const known: KnownMap = {};
  for (const row of rows) {
    known[rowKey(row.kind, row.id)] = { hash: rowHash(row), updatedAt: row.updatedAt, deleted: false };
  }
  return known;
}

describe("hashOf", () => {
  it("ignores key order", () => {
    expect(hashOf({ a: 1, b: [1, 2] })).toBe(hashOf({ b: [1, 2], a: 1 }));
    expect(hashOf({ a: 1 })).not.toBe(hashOf({ a: 2 }));
  });
});

describe("toSyncRows", () => {
  it("syncs personal settings only, never the screen-specific ones", () => {
    const rows = toSyncRows(state({ settings: { ...baseSettings, theme: "dark", dayStart: "07:00" } }), NOW);
    const settings = rows.find((row) => row.kind === "settings");
    expect(settings?.data).toEqual({
      weekStart: baseSettings.weekStart,
      dayStart: "07:00",
      dayEnd: baseSettings.dayEnd,
      activeTemplateId: baseSettings.activeTemplateId,
    });
  });
});

describe("planSync", () => {
  const block = makeInstance({ id: "b1", date: "2026-11-20", updatedAt: "2026-11-20T08:00:00.000Z" });

  it("pushes everything the first time", () => {
    const plan = planSync({ local: toSyncRows(state({ instances: [block] }), NOW), remote: [], known: {}, now: NOW });
    expect(plan.push.map((row) => row.kind).sort()).toEqual(
      ["customTemplates", "instance", "settings", "stabilo"].sort(),
    );
    expect(plan.apply).toEqual([]);
  });

  it("does nothing when both sides agree", () => {
    const local = toSyncRows(state({ instances: [block] }), NOW);
    const plan = planSync({ local, remote: [], known: agreeOn(local), now: NOW });
    expect(plan.push).toEqual([]);
    expect(plan.apply).toEqual([]);
  });

  it("pushes a local edit and a local deletion", () => {
    const before = toSyncRows(state({ instances: [block] }), NOW);
    const edited = { ...block, status: "done" as const, updatedAt: "2026-11-20T09:00:00.000Z" };
    const after = toSyncRows(state({ instances: [edited] }), NOW);
    const plan = planSync({ local: after, remote: [], known: agreeOn(before), now: NOW });
    expect(plan.push).toHaveLength(1);
    expect(plan.push[0]?.data).toMatchObject({ status: "done" });

    const gone = toSyncRows(state(), NOW);
    const deletion = planSync({ local: gone, remote: [], known: agreeOn(before), now: NOW });
    expect(deletion.push).toEqual([
      { kind: "instance", id: "b1", data: null, updatedAt: NOW, deleted: true },
    ]);
  });

  it("applies a newer remote edit, and keeps a newer local one", () => {
    const base = toSyncRows(state({ instances: [block] }), NOW);
    const remote: SyncRow = {
      kind: "instance",
      id: "b1",
      data: { ...block, status: "running", updatedAt: "2026-11-20T09:30:00.000Z" },
      updatedAt: "2026-11-20T09:30:00.000Z",
      deleted: false,
    };
    const applied = planSync({ local: base, remote: [remote], known: agreeOn(base), now: NOW });
    expect(applied.apply).toEqual([remote]);
    expect(applied.push).toEqual([]);

    const newerLocal = { ...block, status: "done" as const, updatedAt: "2026-11-20T09:45:00.000Z" };
    const conflict = planSync({
      local: toSyncRows(state({ instances: [newerLocal] }), NOW),
      remote: [remote],
      known: agreeOn(base),
      now: NOW,
    });
    expect(conflict.apply).toEqual([]);
    expect(conflict.push[0]?.data).toMatchObject({ status: "done" });
  });

  it("applies a remote deletion of an untouched local row", () => {
    const base = toSyncRows(state({ instances: [block] }), NOW);
    const plan = planSync({
      local: base,
      remote: [{ kind: "instance", id: "b1", data: null, updatedAt: NOW, deleted: true }],
      known: agreeOn(base),
      now: NOW,
    });
    expect(plan.apply).toHaveLength(1);
    expect(plan.apply[0]?.deleted).toBe(true);
  });
});

describe("generated block ids", () => {
  it("is the same on every device", () => {
    expect(generatedInstanceId("tpl_a", "2026-11-20")).toBe("blk_tpl_a_2026-11-20");
  });

  it("drops the untouched copy of a duplicated generated block", () => {
    const a = makeInstance({ id: "random_1", date: "2026-11-20", templateId: "tpl_a" });
    const b = makeInstance({ id: "random_2", date: "2026-11-20", templateId: "tpl_a", status: "done" });
    expect(duplicateGeneratedIds([a, b])).toEqual(["random_1"]);
  });

  it("never treats a block moved in from another day as a duplicate", () => {
    const own = makeInstance({ id: generatedInstanceId("tpl_a", "2026-11-21"), date: "2026-11-21", templateId: "tpl_a" });
    const moved = makeInstance({ id: "moved", date: "2026-11-21", templateId: "tpl_a", movedFrom: "2026-11-20" });
    expect(duplicateGeneratedIds([own, moved])).toEqual([]);
  });
});
