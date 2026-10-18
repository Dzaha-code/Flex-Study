import { z } from "zod";
import { coerceCategorySymbol } from "@/domain/types";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  Reflection,
  Settings,
  ShiftEvent,
  ShiftMove,
  StabiloPrefs,
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

/**
 * Categories are marked by a geometric symbol, never a colour (DESIGN.md
 * §3.3). `preprocess` keeps data written before v2 readable: an old icon name
 * such as `"book"` is mapped onto its symbol instead of failing the parse, so
 * existing IndexedDB rows and exported JSON still import.
 */
export const categorySymbolSchema = z.enum([
  "disc",
  "square",
  "diamond",
  "triangle",
  "ring",
  "square-open",
  "diamond-open",
  "triangle-open",
  "star",
  "plus",
]);

const categoryIconSchema = z.preprocess(coerceCategorySymbol, categorySymbolSchema);

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
  // Defaulted rather than required, so a journal exported before titles and
  // favourites existed still imports instead of failing validation.
  title: z.string().max(120).default(""),
  promptId: z.string().nullable(),
  body: z.string().max(50_000),
  learnings: z.array(z.string().max(500)).length(3),
  wordCount: z.number().int().min(0),
  favorite: z.boolean().default(false),
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
  intro: z.enum(["once", "always", "off"]).default("once"),
  weekStart: z.union([z.literal(0), z.literal(1)]),
  remindersEnabled: z.boolean(),
  dayStart: clockTimeSchema,
  dayEnd: clockTimeSchema,
  // Defaulted rather than required, so a workspace exported before these
  // preferences existed still imports instead of failing validation.
  contentWidth: z.enum(["comfortable", "wide", "full"]).default("wide"),
  onboardingCompleted: z.boolean(),
  tourCompleted: z.boolean().default(false),
  activeTemplateId: z.string().nullable(),
});

export const StabiloPrefsSchema = z.object({
  enabled: z.boolean().default(true),
  intensity: z.enum(["sweet", "spooky", "full"]).default("spooky"),
  fx: z.boolean().default(true),
  sound: z.enum(["off", "soft", "normal"]).default("normal"),
  nickname: z.string().max(40).default(""),
  introSeen: z.boolean().default(false),
  tourDone: z.boolean().default(false),
  ph3Seen: z.number().int().min(0).default(0),
  progress: z
    .object({
      nodeId: z.string().min(1),
      phase: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    })
    .nullable()
    .default(null),
});

/**
 * A template saved from the user's own plan. Kept in `meta`, like Stabilo's
 * preferences: a single JSON row does not justify a Dexie version bump, and a
 * failed parse falls back to an empty list rather than blocking the boot.
 */
export const customTemplateSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(240).default(""),
  createdAt: timestampSchema,
  categories: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        icon: categoryIconSchema,
        weeklyTargetMinutes: z.number().int().min(0),
      }),
    )
    .min(1),
  blocks: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        categoryIndex: z.number().int().min(0),
        durationMin: z.number().int().min(1),
        days: z.array(z.number().int().min(0).max(6)),
        plannedStart: clockTimeSchema.nullable(),
      }),
    )
    .default([]),
});

export const customTemplatesSchema = z.array(customTemplateSchema);

export const WorkspaceSchema = z.object({
  categories: z.array(CategorySchema),
  templates: z.array(BlockTemplateSchema),
  instances: z.array(BlockInstanceSchema),
  reflections: z.array(ReflectionSchema),
  shiftEvents: z.array(ShiftEventSchema),
  settings: SettingsSchema,
  // Optional rather than defaulted: an older export without the key must keep
  // importing, and an absent field means "keep whatever this device has".
  stabilo: StabiloPrefsSchema.optional(),
  // Same rule as `stabilo`: absent means "keep what this device already has".
  customTemplates: customTemplatesSchema.optional(),
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
export const stabiloPrefsTypeCheck = (
  value: z.infer<typeof StabiloPrefsSchema>,
): StabiloPrefs => value;
export const workspaceTypeCheck = (value: z.infer<typeof WorkspaceSchema>): Workspace => value;
