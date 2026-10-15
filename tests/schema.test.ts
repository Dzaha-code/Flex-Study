import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "@/domain/types";
import type { Reflection, ShiftEvent, Workspace } from "@/domain/types";
import { countWorkspace, parseWorkspaceImport, serializeWorkspace } from "@/data/workspace-io";
import { STAMP, baseSettings, makeCategory, makeInstance } from "./helpers";

function makeWorkspace(): Workspace {
  const reflection: Reflection = {
    id: "refl_1",
    date: "2026-10-14",
    title: "Bab tiga",
    promptId: "reflection.prompt.win",
    body: "Dua bab selesai.",
    learnings: ["mulai lebih pagi", "", ""],
    wordCount: 3,
    favorite: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: SCHEMA_VERSION,
  };

  const instance = makeInstance({
    id: "blk_1",
    date: "2026-10-14",
    title: "Sesi belajar 1",
    plannedStart: "08:00",
  });

  const shiftEvent: ShiftEvent = {
    id: "shift_1",
    date: "2026-10-14",
    strategy: "move_open_to_day",
    reason: "hari berantakan",
    moves: [
      {
        instanceId: "blk_1",
        title: "Sesi belajar 1",
        action: "moved",
        fromDate: "2026-10-14",
        toDate: "2026-10-15",
        fromStart: "08:00",
        toStart: null,
      },
    ],
    restoreBefore: [instance],
    createdInstanceIds: ["blk_2"],
    undone: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: SCHEMA_VERSION,
  };

  return {
    categories: [makeCategory({ id: "cat_1", name: "Belajar ujian", weeklyTargetMinutes: 900 })],
    templates: [
      {
        id: "tpl_1",
        categoryId: "cat_1",
        title: "Sesi belajar 1",
        durationMin: 90,
        days: [1, 2, 3, 4, 5],
        order: 0,
        plannedStart: null,
        archived: false,
        createdAt: STAMP,
        updatedAt: STAMP,
        schemaVersion: SCHEMA_VERSION,
      },
    ],
    instances: [instance],
    reflections: [reflection],
    shiftEvents: [shiftEvent],
    settings: { ...baseSettings },
  };
}

function wrap(workspace: Workspace): string {
  return JSON.stringify({
    app: "flexstudy",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-10-14T00:00:00.000Z",
    workspace,
  });
}

describe("workspace backup", () => {
  it("round-trips without losing information", () => {
    const workspace = makeWorkspace();
    const result = parseWorkspaceImport(serializeWorkspace(workspace, Date.now()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(countWorkspace(result.workspace)).toEqual(countWorkspace(workspace));
    expect(result.workspace.instances[0].title).toBe("Sesi belajar 1");
    expect(result.workspace.instances[0].plannedStart).toBe("08:00");
    expect(result.workspace.reflections[0].learnings).toHaveLength(3);
    expect(result.workspace.reflections[0].title).toBe("Bab tiga");
    expect(result.workspace.reflections[0].favorite).toBe(true);
    expect(result.workspace.shiftEvents[0].reason).toBe("hari berantakan");
  });

  it("accepts an empty workspace", () => {
    const empty: Workspace = {
      categories: [],
      templates: [],
      instances: [],
      reflections: [],
      shiftEvents: [],
      settings: { ...DEFAULT_SETTINGS },
    };

    const result = parseWorkspaceImport(wrap(empty));
    expect(result.ok).toBe(true);
  });

  it("imports a backup made before the view preferences existed", () => {
    const workspace = makeWorkspace();

    // Exactly what an export from the previous release carries: no
    // `contentWidth`, no `tourCompleted` and no `intro`, because those
    // preferences did not exist yet. The schema defaults have to absorb them.
    const legacySettings = {
      locale: "id",
      theme: "system",
      weekStart: 1,
      remindersEnabled: false,
      dayStart: "08:00",
      dayEnd: "21:30",
      onboardingCompleted: true,
      activeTemplateId: null,
    };

    // Same story for the journal: a journal entry written before titles and
    // favourites existed has neither field.
    const legacyReflection = {
      id: "refl_1",
      date: "2026-10-14",
      promptId: "reflection.prompt.win",
      body: "Dua bab selesai.",
      learnings: ["mulai lebih pagi", "", ""],
      wordCount: 3,
      createdAt: STAMP,
      updatedAt: STAMP,
      schemaVersion: SCHEMA_VERSION,
    };

    const result = parseWorkspaceImport(
      wrap({
        ...workspace,
        reflections: [legacyReflection],
        settings: legacySettings,
      } as unknown as Workspace),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.workspace.settings.contentWidth).toBe("wide");
    expect(result.workspace.settings.tourCompleted).toBe(false);
    // The opening animation keeps its old behaviour rather than silently
    // becoming "off" for anyone restoring a backup.
    expect(result.workspace.settings.intro).toBe("once");
    expect(result.workspace.settings.onboardingCompleted).toBe(true);
    expect(result.workspace.reflections[0].title).toBe("");
    expect(result.workspace.reflections[0].favorite).toBe(false);
  });

  it("rejects text that is not JSON", () => {
    const result = parseWorkspaceImport("{ not json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["json.invalid"]);
  });

  it("rejects a file from an unrelated app", () => {
    const result = parseWorkspaceImport(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a clock time that is not a clock time", () => {
    const workspace = makeWorkspace();
    workspace.instances[0].plannedStart = "25:00";
    expect(parseWorkspaceImport(wrap(workspace)).ok).toBe(false);
  });

  it("rejects a reflection that does not have three learning slots", () => {
    const workspace = makeWorkspace();
    workspace.reflections[0].learnings = ["hanya satu"];
    expect(parseWorkspaceImport(wrap(workspace)).ok).toBe(false);
  });
});
