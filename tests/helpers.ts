import type {
  BlockInstance,
  BlockStatus,
  BlockTemplate,
  Category,
  Settings,
} from "@/domain/types";

export const STAMP = "2026-10-14T00:00:00.000Z";

export const baseSettings: Settings = {
  locale: "id",
  theme: "system",
  weekStart: 1,
  remindersEnabled: false,
  dayStart: "08:00",
  dayEnd: "21:30",
  onboardingCompleted: true,
  activeTemplateId: null,
};

export const bounds = {
  dayStart: baseSettings.dayStart,
  dayEnd: baseSettings.dayEnd,
};

export function atLocal(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

export function makeInstance(
  partial: Partial<BlockInstance> & Pick<BlockInstance, "id" | "date">,
): BlockInstance {
  return {
    templateId: null,
    categoryId: "study",
    title: partial.id,
    durationMin: 60,
    plannedStart: null,
    order: 0,
    status: "planned" as BlockStatus,
    actualSeconds: 0,
    startedAt: null,
    note: "",
    movedFrom: null,
    movedTo: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: 1,
    ...partial,
  };
}

export function makeCategory(partial: Partial<Category> & Pick<Category, "id">): Category {
  return {
    name: partial.id,
    icon: "disc",
    weeklyTargetMinutes: 300,
    order: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: 1,
    ...partial,
  };
}

export function makeTemplate(
  partial: Partial<BlockTemplate> & Pick<BlockTemplate, "id">,
): BlockTemplate {
  return {
    categoryId: "study",
    title: partial.id,
    durationMin: 60,
    days: [1, 2, 3, 4, 5],
    order: 0,
    plannedStart: null,
    archived: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    schemaVersion: 1,
    ...partial,
  };
}
