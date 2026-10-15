import { describe, expect, it } from "vitest";
import {
  isUntouchedInstance,
  orphanedInstanceIds,
  propagateTemplateEdit,
  resolveEditTarget,
} from "@/domain/propagate";
import type { BlockInstance, BlockTemplate } from "@/domain/types";
import { makeInstance, makeTemplate } from "./helpers";

const STAMP = "2026-10-15T09:00:00.000Z";

function template(partial: Partial<BlockTemplate> = {}): BlockTemplate {
  return makeTemplate({
    id: "tpl-1",
    categoryId: "cat-study",
    title: "Sesi belajar 1: TPS dan Literasi",
    durationMin: 90,
    days: [1, 2, 3, 4, 5],
    order: 0,
    plannedStart: null,
    ...partial,
  });
}

function instance(partial: Partial<BlockInstance> = {}): BlockInstance {
  return makeInstance({
    id: "ins-1",
    date: "2026-10-15",
    templateId: "tpl-1",
    categoryId: "cat-study",
    title: "Sesi belajar 1: TPS dan Litersi",
    durationMin: 90,
    plannedStart: null,
    order: 0,
    ...partial,
  });
}

describe("isUntouchedInstance", () => {
  it("is true for a plain planned block", () => {
    expect(isUntouchedInstance(instance())).toBe(true);
  });

  it.each([
    ["started", { status: "running" as const }],
    ["completed", { status: "done" as const }],
    ["postponed", { status: "deferred" as const }],
    ["measured", { actualSeconds: 60 }],
    ["timer running", { startedAt: 1_760_000_000_000 }],
    ["annotated", { note: "bab 3" }],
    ["arrived from another day", { movedFrom: "2026-10-14" }],
    ["sent to another day", { movedTo: "2026-10-17" }],
  ])("is false once the block has been %s", (_label, patch) => {
    expect(isUntouchedInstance(instance(patch))).toBe(false);
  });

  it("ignores whitespace-only notes", () => {
    expect(isUntouchedInstance(instance({ note: "   " }))).toBe(true);
  });
});

describe("propagateTemplateEdit", () => {
  it("rewrites today's block, which is the whole point of fixing a typo", () => {
    const fixed = template({ title: "Sesi belajar 1: TPS dan Literasi" });
    const result = propagateTemplateEdit([instance()], fixed, STAMP, "2026-10-15");

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Sesi belajar 1: TPS dan Literasi");
    expect(result[0]?.updatedAt).toBe(STAMP);
  });

  it("rewrites past pending days too", () => {
    const past = instance({ id: "ins-past", date: "2026-10-13" });
    const result = propagateTemplateEdit([past], template(), STAMP, "2026-10-15");
    expect(result.map((row) => row.id)).toEqual(["ins-past"]);
  });

  it("leaves future days alone so they can be regenerated from the template", () => {
    const future = instance({ id: "ins-future", date: "2026-10-20" });
    const result = propagateTemplateEdit([future], template(), STAMP, "2026-10-15");
    expect(result).toHaveLength(0);
  });

  it("never rewrites a block the user already acted on", () => {
    const done = instance({ id: "ins-done", status: "done", actualSeconds: 3_600 });
    const noted = instance({ id: "ins-noted", note: "bab 3 selesai" });
    const running = instance({ id: "ins-running", status: "running" });

    const result = propagateTemplateEdit([done, noted, running], template(), STAMP, "2026-10-15");
    expect(result).toHaveLength(0);
  });

  it("carries duration, category, start and order across as well as the title", () => {
    const changed = template({
      title: "Sesi belajar",
      categoryId: "cat-project",
      durationMin: 45,
      plannedStart: "19:30",
      order: 4,
    });
    const result = propagateTemplateEdit([instance()], changed, STAMP, "2026-10-15");

    expect(result[0]).toMatchObject({
      title: "Sesi belajar",
      categoryId: "cat-project",
      durationMin: 45,
      plannedStart: "19:30",
      order: 4,
    });
  });

  it("does not touch blocks belonging to another template", () => {
    const other = instance({ id: "ins-other", templateId: "tpl-2" });
    const result = propagateTemplateEdit([other], template(), STAMP, "2026-10-15");
    expect(result).toHaveLength(0);
  });

  it("leaves instances with no template alone", () => {
    const manual = instance({ id: "ins-manual", templateId: null });
    const result = propagateTemplateEdit([manual], template(), STAMP, "2026-10-15");
    expect(result).toHaveLength(0);
  });
});

describe("resolveEditTarget", () => {
  it("edits the template behind a generated block", () => {
    const target = resolveEditTarget(instance(), [template()]);
    expect(target.kind).toBe("template");
    if (target.kind === "template") expect(target.template.id).toBe("tpl-1");
  });

  it("edits the occurrence itself when there is no template behind it", () => {
    const target = resolveEditTarget(instance({ templateId: null }), [template()]);
    expect(target.kind).toBe("instance");
  });

  it("falls back to the occurrence when its template has since been deleted", () => {
    const target = resolveEditTarget(instance(), []);
    expect(target.kind).toBe("instance");
  });
});

describe("orphanedInstanceIds", () => {
  it("collects pending occurrences of a deleted block, including today's", () => {
    const today = instance({ id: "ins-today" });
    const past = instance({ id: "ins-past", date: "2026-10-12" });
    const ids = orphanedInstanceIds([today, past], ["tpl-1"], "2026-10-15");
    expect(ids.sort()).toEqual(["ins-past", "ins-today"]);
  });

  it("keeps occurrences the user already worked on as history", () => {
    const done = instance({ id: "ins-done", status: "done", actualSeconds: 60 });
    expect(orphanedInstanceIds([done], ["tpl-1"], "2026-10-15")).toEqual([]);
  });

  it("ignores other templates and manual blocks", () => {
    const other = instance({ id: "ins-other", templateId: "tpl-2" });
    const manual = instance({ id: "ins-manual", templateId: null });
    expect(orphanedInstanceIds([other, manual], ["tpl-1"], "2026-10-15")).toEqual([]);
  });
});
