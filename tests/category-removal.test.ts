import { describe, expect, it } from "vitest";
import {
  categoryUsage,
  reassignCategory,
  replacementCategory,
} from "@/domain/category-removal";
import type { BlockInstance, BlockTemplate, Category } from "@/domain/types";

function category(id: string, order: number, name = id): Category {
  return {
    id,
    name,
    icon: "disc",
    weeklyTargetMinutes: 0,
    order,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: 1,
  };
}

function template(id: string, categoryId: string): BlockTemplate {
  return {
    id,
    categoryId,
    title: id,
    durationMin: 30,
    days: [1],
    order: 0,
    plannedStart: null,
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: 1,
  };
}

function instance(id: string, categoryId: string, date = "2026-03-02"): BlockInstance {
  return {
    id,
    date,
    templateId: null,
    categoryId,
    title: id,
    durationMin: 30,
    plannedStart: null,
    order: 0,
    status: "done",
    actualSeconds: 0,
    startedAt: null,
    note: "",
    movedFrom: null,
    movedTo: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: 1,
  };
}

describe("categoryUsage", () => {
  it("counts templates and instances that point at the category", () => {
    const usage = categoryUsage(
      "a",
      [template("t1", "a"), template("t2", "b"), template("t3", "a")],
      [instance("i1", "a"), instance("i2", "b"), instance("i3", "a"), instance("i4", "a")],
    );

    expect(usage).toEqual({ templates: 2, instances: 3, total: 5 });
  });

  it("is zero for a category nothing uses", () => {
    expect(categoryUsage("z", [template("t1", "a")], [instance("i1", "a")])).toEqual({
      templates: 0,
      instances: 0,
      total: 0,
    });
  });
});

describe("replacementCategory", () => {
  it("picks the lowest order among the remaining categories", () => {
    const categories = [category("c", 3), category("a", 1), category("b", 2)];

    expect(replacementCategory(categories, "a")?.id).toBe("b");
  });

  it("breaks an order tie by name, not by array position", () => {
    const categories = [category("z", 2, "Zebra"), category("a", 2, "Alpha")];

    expect(replacementCategory(categories, "x")?.id).toBe("a");
  });

  it("returns null when the removed category is the only one left", () => {
    expect(replacementCategory([category("only", 0)], "only")).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(replacementCategory([], "anything")).toBeNull();
  });
});

describe("reassignCategory", () => {
  const stamp = "2026-03-02T10:00:00.000Z";

  it("returns only the rows that pointed at the removed category", () => {
    const rows = [template("t1", "old"), template("t2", "keep"), template("t3", "old")];

    expect(reassignCategory(rows, "old", "new", stamp).map((row) => row.id)).toEqual(["t1", "t3"]);
  });

  it("rewrites the category and refreshes the timestamp", () => {
    const [moved] = reassignCategory([template("t1", "old")], "old", "new", stamp);

    expect(moved.categoryId).toBe("new");
    expect(moved.updatedAt).toBe(stamp);
  });

  it("does not mutate the rows it was given", () => {
    const rows = [template("t1", "old")];
    reassignCategory(rows, "old", "new", stamp);

    expect(rows[0].categoryId).toBe("old");
  });

  it("returns nothing when the target is the category being removed", () => {
    expect(reassignCategory([template("t1", "old")], "old", "old", stamp)).toEqual([]);
  });
});
