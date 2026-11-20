import { describe, expect, it } from "vitest";
import {
  isReplaceableBySwitch,
  makeTemplateSwitchEvent,
  planTemplateSwitch,
  undoTemplateSwitch,
  withCreatedInstances,
} from "@/domain/template-switch";
import type { BlockInstance } from "@/domain/types";
import { makeCategory, makeInstance, makeTemplate, STAMP } from "./helpers";

/** A block that came from the plan. The shared helper builds a hand-added one. */
function generated(
  partial: Partial<BlockInstance> & Pick<BlockInstance, "id" | "date">,
): BlockInstance {
  return makeInstance({ templateId: "tpl_plan", ...partial });
}

const TODAY = "2026-10-22";
const YESTERDAY = "2026-10-21";
const TOMORROW = "2026-10-23";

function countKept(plan: ReturnType<typeof planTemplateSwitch>): number {
  return plan.kept.total;
}

describe("isReplaceableBySwitch", () => {
  it("replaces an untouched planned block from the start day onward", () => {
    expect(isReplaceableBySwitch(generated({ id: "a", date: TODAY }), TODAY)).toBe(true);
    expect(isReplaceableBySwitch(generated({ id: "b", date: TOMORROW }), TODAY)).toBe(true);
  });

  it("keeps a one-off block added by hand, even when untouched", () => {
    const meetUp = makeInstance({ id: "m", date: TOMORROW, templateId: null });
    expect(isReplaceableBySwitch(meetUp, TODAY)).toBe(false);
  });

  it("never touches days before the start day", () => {
    expect(isReplaceableBySwitch(generated({ id: "a", date: YESTERDAY }), TODAY)).toBe(false);
  });

  it("never touches blocks the user worked on", () => {
    const running = generated({ id: "a", date: TODAY, status: "running" });
    const done = generated({ id: "b", date: TODAY, status: "done" });
    const noted = generated({ id: "c", date: TODAY, note: "jangan hilang" });
    const measured = generated({ id: "d", date: TODAY, actualSeconds: 60 });
    const movedIn = generated({ id: "e", date: TODAY, movedFrom: YESTERDAY });

    for (const instance of [running, done, noted, measured, movedIn]) {
      expect(isReplaceableBySwitch(instance, TODAY)).toBe(false);
    }
  });
});

describe("planTemplateSwitch", () => {
  it("splits the calendar into replaced and kept, without double counting", () => {
    const instances = [
      generated({ id: "past", date: YESTERDAY }), // history: neither replaced nor kept
      generated({ id: "plain", date: TODAY }),
      generated({ id: "done", date: TODAY, status: "done" }),
      generated({ id: "running", date: TODAY, status: "running" }),
      generated({ id: "noted", date: TODAY, note: "catatan" }),
      generated({ id: "measured", date: TOMORROW, actualSeconds: 120 }),
      generated({ id: "skipped", date: TOMORROW, status: "skipped" }),
    ];

    const plan = planTemplateSwitch({ instances, startDate: TODAY });

    expect(plan.replacedIds).toEqual(["plain"]);
    expect(plan.restoreBefore.map((instance) => instance.id)).toEqual(["plain"]);
    expect(countKept(plan)).toBe(5);
    expect(plan.kept).toEqual({
      total: 5,
      done: 1,
      running: 1,
      noted: 1,
      measured: 1,
      other: 1,
    });
  });

  it("scopes itself to the start day: earlier days are out of the switch", () => {
    const instances = [
      // Belongs to the old plan either way — neither replaced nor counted.
      generated({ id: "today", date: TODAY }),
      generated({ id: "tomorrow-done", date: TOMORROW, status: "done" }),
      generated({ id: "next-day", date: "2026-10-24" }),
    ];
    const plan = planTemplateSwitch({ instances, startDate: TOMORROW });

    expect(plan.replacedIds).toEqual(["next-day"]);
    expect(plan.kept.total).toBe(1);
    expect(plan.kept.done).toBe(1);
  });

  it("is idempotent: after applying, the same plan replaces nothing", () => {
    const first = planTemplateSwitch({
      instances: [generated({ id: "a", date: TODAY })],
      startDate: TODAY,
    });
    expect(first.replacedIds).toEqual(["a"]);

    // Simulate the apply: the replaced rows are gone, kept rows remain.
    const second = planTemplateSwitch({
      instances: [generated({ id: "kept", date: TODAY, status: "done" })],
      startDate: TODAY,
    });
    expect(second.replacedIds).toEqual([]);
  });
});

describe("makeTemplateSwitchEvent / undoTemplateSwitch", () => {
  const plan = planTemplateSwitch({
    instances: [
      generated({ id: "replace-me", date: TODAY }),
      generated({ id: "keep-me", date: TODAY, status: "done" }),
    ],
    startDate: TODAY,
  });
  const previousTemplates = [makeTemplate({ id: "tpl-old" })];
  const previousCategories = [makeCategory({ id: "cat-old" })];

  it("undo restores exactly what was removed and deletes what was created", () => {
    const event = makeTemplateSwitchEvent({
      plan,
      previousTemplateId: "old-template",
      previousTemplates,
      previousCategories,
      now: Date.parse(STAMP),
      newId: (prefix) => `${prefix}-1`,
    });
    expect(event.id).toBe("tsw-1");
    expect(event.previousTemplateId).toBe("old-template");
    expect(event.replacedIds).toEqual(["replace-me"]);
    expect(event.createdInstanceIds).toEqual([]);
    expect(event.undone).toBe(false);

    const withCreated = withCreatedInstances(event, ["new-a", "new-b"], Date.parse(STAMP));
    const undo = undoTemplateSwitch(withCreated);

    expect(undo.upserts.map((instance) => instance.id)).toEqual(["replace-me"]);
    expect(undo.deletes).toEqual(["new-a", "new-b"]);
    // The restored row is a copy, not a live reference into the event.
    expect(undo.upserts[0]).not.toBe(event.restoreBefore[0]);
  });

  /**
   * The half-undo that would have shipped otherwise: instances come back but
   * the plan behind them does not, so every restored row dangles — and the
   * next ensureRange sees ids it does not know and stacks duplicates beside
   * them.
   */
  it("undo also returns the previous plan, so nothing dangles", () => {
    const event = makeTemplateSwitchEvent({
      plan,
      previousTemplateId: "old-template",
      previousTemplates,
      previousCategories,
      now: Date.parse(STAMP),
      newId: (prefix) => `${prefix}-1`,
    });
    const undo = undoTemplateSwitch(event);

    expect(undo.templates.map((template) => template.id)).toEqual(["tpl-old"]);
    expect(undo.categories.map((category) => category.id)).toEqual(["cat-old"]);
    // Copies again: the caller must not be able to mutate the event's record.
    expect(undo.templates[0]).not.toBe(event.previousTemplates[0]);
    expect(undo.categories[0]).not.toBe(event.previousCategories[0]);
  });

  it("previews equal the application: restoreBefore mirrors replacedIds", () => {
    expect(plan.restoreBefore.map((instance) => instance.id)).toEqual(plan.replacedIds);
  });
});
