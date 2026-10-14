import { z } from "zod";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  Reflection,
  Settings,
  ShiftEvent,
  ShiftMove,
  Workspace,
} from "@/domain/types";

/**
 * One source of truth for the shape of everything that is stored, exported or
 * later handed to an AI tool. The domain types stay dependency-free; the
 * `*TypeCheck` helpers below fail to compile if the two ever drift apart.
 */

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timestampSchema = z.string().min(1);
const identifierSchema = z.string().min(1);

const entityShape = {
  id: identifierSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  schemaVersion: z.number().int().positive(),
};

export const categoryIconSchema = z.enum([
  "book",
  "briefcase",
  "notebook",
  "language",
  "heart",
  "run",
  "sparkle",
  "clock",
]);

export const linePatternSchema = z.enum(["solid", "dashed", "dotted"]);

export const blockStatusSchema = z.enum([
  "planned",
  "running",
  "done",
  "deferred",
  "skipped",
]);

export const shiftStrategySchema = z.enum([
  "move_open_to_next_slot",
  "move_open_to_day",
  "swap",
  "skip_rest",
]);

export const CategorySchema = z.object({
  ...entityShape,
  name: z.string().min(1).max(80),
  icon: categoryIconSchema,
  linePattern: linePatternSchema,
  weeklyTargetMinutes: z.number().int().min(0).max(10_080),
  order: z.number().int().min(0).max(9_999),
});

export const BlockTemplateSchema = z.object({
  ...entityShape,
  categoryId: identifierSchema,
  title: z.string().min(1).max(120),
  durationMin: z.number().int().min(1).max(1_440),
  days: z.array(z.number().int().min(0).max(6)),
  order: z.number().int().min(0).max(9_999),
  plannedStart: clockTimeSchema.nullable(),
  archived: z.boolean(),
});

export const BlockInstanceSchema = z.object({
  ...entityShape,
  date: isoDateSchema,
  templateId: identifierSchema.nullable(),
  categoryId: identifierSchema,
  title: z.string().min(1).max(120),
  durationMin: z.number().int().min(1).max(1_440),
  plannedStart: clockTimeSchema.nullable(),
  order: z.number().int().min(0).max(9_999),
  status: blockStatusSchema,
  actualSeconds: z.number().int().min(0),
  startedAt: z.number().int().nullable(),
  note: z.string().max(20_000),
  movedFrom: isoDateSchema.nullable(),
  movedTo: isoDateSchema.nullable(),
});

export const ReflectionSchema = z.object({
  ...entityShape,
  date: isoDateSchema,
  promptId: z.string().nullable(),
  body: z.string().max(50_000),
  learnings: z.array(z.string().max(500)).length(3),
  wordCount: z.number().int().min(0),
});

export const ShiftMoveSchema = z.object({
  instanceId: identifierSchema,
  title: z.string().min(1).max(120),
  action: z.enum(["moved", "skipped"]),
  fromDate: isoDateSchema,
  toDate: isoDateSchema,
  fromStart: clockTimeSchema.nullable(),
  toStart: clockTimeSchema.nullable(),
});

export const ShiftEventSchema = z.object({
  ...entityShape,
  date: isoDateSchema,
  strategy: shiftStrategySchema,
  reason: z.string().max(500).nullable(),
  moves: z.array(ShiftMoveSchema),
  restoreBefore: z.array(BlockInstanceSchema),
  createdInstanceIds: z.array(identifierSchema),
  undone: z.boolean(),
});

export const SettingsSchema = z.object({
  locale: z.enum(["id", "en"]),
  theme: z.enum(["system", "light", "dark"]),
  weekStart: z.union([z.literal(0), z.literal(1)]),
  remindersEnabled: z.boolean(),
  dayStart: clockTimeSchema,
  dayEnd: clockTimeSchema,
  onboardingCompleted: z.boolean(),
  activeTemplateId: z.string().nullable(),
});

export const WorkspaceSchema = z.object({
  categories: z.array(CategorySchema),
  templates: z.array(BlockTemplateSchema),
  instances: z.array(BlockInstanceSchema),
  reflections: z.array(ReflectionSchema),
  shiftEvents: z.array(ShiftEventSchema),
  settings: SettingsSchema,
});

export const WorkspaceExportSchema = z.object({
  app: z.literal("flexstudy"),
  schemaVersion: z.number().int().positive(),
  exportedAt: timestampSchema,
  workspace: WorkspaceSchema,
});

/*
 * Compile-time contracts. These are intentionally exported so that a mismatch
 * between a schema and its domain type becomes a build error, not a runtime
 * surprise. They are never called.
 */
export const categoryTypeCheck = (value: z.infer<typeof CategorySchema>): Category => value;
export const blockTemplateTypeCheck = (value: z.infer<typeof BlockTemplateSchema>): BlockTemplate =>
  value;
export const blockInstanceTypeCheck = (value: z.infer<typeof BlockInstanceSchema>): BlockInstance =>
  value;
export const reflectionTypeCheck = (value: z.infer<typeof ReflectionSchema>): Reflection => value;
export const shiftMoveTypeCheck = (value: z.infer<typeof ShiftMoveSchema>): ShiftMove => value;
export const shiftEventTypeCheck = (value: z.infer<typeof ShiftEventSchema>): ShiftEvent => value;
export const settingsTypeCheck = (value: z.infer<typeof SettingsSchema>): Settings => value;
export const workspaceTypeCheck = (value: z.infer<typeof WorkspaceSchema>): Workspace => value;
