import { describe, expect, it } from "vitest";
import { buildFromTemplate, TEMPLATES, toStudyTemplate, type CustomTemplate } from "@/templates";
import type { Locale } from "@/domain/types";

const newId = (() => {
  let counter = 0;
  return (prefix: string) => `${prefix}_${++counter}`;
})();

describe("catalog templates", () => {
  /**
   * The first-run screen lands on Today. A template that only schedules
   * weekdays leaves that screen empty every Saturday and Sunday, which reads as
   * "the template was never applied" — the exact bug this guards.
   */
  it("gives every day of the week at least one block", () => {
    for (const template of TEMPLATES) {
      if (template.blocks.length === 0) continue;
      const covered = new Set(template.blocks.flatMap((block) => block.days));
      for (let day = 0; day < 7; day += 1) {
        expect(covered.has(day), `${template.templateId} has no block on day ${day}`).toBe(true);
      }
    }
  });

  it("keeps every block attached to a category that exists", () => {
    for (const template of TEMPLATES) {
      const ids = new Set(template.categories.map((category) => category.id));
      for (const block of template.blocks) {
        expect(ids.has(block.categoryId), `${template.templateId}: ${block.title.id}`).toBe(true);
      }
    }
  });
});

describe("buildFromTemplate", () => {
  it("copies titles in the requested language", () => {
    const english = TEMPLATES.find((template) => template.templateId === "utbk-pkl");
    if (!english) throw new Error("missing template");

    const { blockTemplates } = buildFromTemplate({
      template: english,
      now: Date.parse("2026-10-18T09:00:00Z"),
      newId,
      locale: "en" as Locale,
    });

    expect(blockTemplates[0]?.title).toBe("Study session 1: reasoning and literacy");
  });
});

describe("toStudyTemplate", () => {
  const saved: CustomTemplate = {
    id: "ctpl_1",
    name: "Weekday routine",
    description: "What I actually do",
    createdAt: "2026-10-18T09:00:00.000Z",
    categories: [
      { name: "Study", icon: "disc", weeklyTargetMinutes: 600 },
      { name: "Rest", icon: "ring", weeklyTargetMinutes: 0 },
    ],
    blocks: [
      { title: "Morning", categoryIndex: 0, durationMin: 45, days: [1, 2], plannedStart: "08:00" },
      { title: "Break", categoryIndex: 1, durationMin: 15, days: [1], plannedStart: null },
    ],
  };

  it("keeps blocks attached to the right category", () => {
    const template = toStudyTemplate(saved);
    expect(template.categories.map((category) => category.name.en)).toEqual(["Study", "Rest"]);
    expect(template.blocks.map((block) => block.categoryId)).toEqual(["c0", "c1"]);
    expect(template.blocks[0]?.plannedStart).toBe("08:00");
  });

  it("drops a block whose category index does not exist", () => {
    const template = toStudyTemplate({
      ...saved,
      blocks: [
        ...saved.blocks,
        { title: "Orphan", categoryIndex: 9, durationMin: 10, days: [3], plannedStart: null },
      ],
    });
    expect(template.blocks.map((block) => block.title.en)).toEqual(["Morning", "Break"]);
  });

  it("can be fed back through the apply pipeline", () => {
    const { categories, blockTemplates } = buildFromTemplate({
      template: toStudyTemplate(saved),
      now: Date.parse("2026-10-18T09:00:00Z"),
      newId,
      locale: "en" as Locale,
    });

    expect(categories).toHaveLength(2);
    expect(blockTemplates.map((block) => block.title)).toEqual(["Morning", "Break"]);
    expect(categories.map((category) => category.id)).toContain(blockTemplates[0]?.categoryId);
  });
});
