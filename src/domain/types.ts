/**
 * Core data model.
 *
 * The system itself does not know what "UTBK" or "PKL" is — that is template
 * content. Generic concepts live here: focus session, journal, reflection.
 *
 * Every entity carries a stable `id`, `createdAt`, `updatedAt` and
 * `schemaVersion` so migration and later synchronisation stay possible.
 */
import type { ISODate, ClockTime } from "./time";

export const SCHEMA_VERSION = 1;

export type { ISODate, ClockTime };

export type BlockStatus = "planned" | "running" | "done" | "deferred" | "skipped";

export type LinePattern = "solid" | "dashed" | "dotted";

export type Locale = "id" | "en";

export type ThemePreference = "system" | "light" | "dark";

/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

/**
 * Categories are told apart by a geometric symbol plus their name — never by
 * hue (DESIGN.md §3.3). Four symbols are used by the built-in categories; the
 * remaining six are reserved for categories the user creates.
 */
export type CategorySymbol =
  | "disc" // ●  study
  | "square" // ■  project
  | "diamond" // ◆  journal
  | "triangle" // ▲  language
  | "ring" // ○
  | "square-open" // □
  | "diamond-open" // ◇
  | "triangle-open" // △
  | "star" // ★
  | "plus"; // ✚

/** The built-ins in template order; user categories draw from here as well. */
export const CATEGORY_SYMBOLS: CategorySymbol[] = [
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
];

/**
 * Symbols used before v2's geometric set, when categories borrowed from an
 * icon library. Kept so existing IndexedDB rows and exported JSON still load.
 */
export const LEGACY_ICON_TO_SYMBOL: Record<string, CategorySymbol> = {
  book: "disc",
  briefcase: "square",
  notebook: "diamond",
  language: "triangle",
  clock: "ring",
  heart: "star",
  run: "plus",
  sparkle: "star",
};

export function coerceCategorySymbol(value: unknown): CategorySymbol {
  if (typeof value !== "string") return "disc";
  if ((CATEGORY_SYMBOLS as string[]).includes(value)) return value as CategorySymbol;
  return LEGACY_ICON_TO_SYMBOL[value] ?? "disc";
}

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface Category extends Entity {
  name: string;
  /** Geometric marker. Never a colour — categories survive colour blindness. */
  icon: CategorySymbol;
  weeklyTargetMinutes: number;
  order: number;
}

export interface BlockTemplate extends Entity {
  categoryId: string;
  title: string;
  durationMin: number;
  /** Days the block recurs on. 0 = Sunday … 6 = Saturday. */
  days: number[];
  order: number;
  /** Optional fixed start. `null` means the block floats in sequence. */
  plannedStart: ClockTime | null;
  archived: boolean;
}

export interface BlockInstance extends Entity {
  date: ISODate;
  templateId: string | null;
  categoryId: string;
  title: string;
  durationMin: number;
  plannedStart: ClockTime | null;
  order: number;
  status: BlockStatus;
  /** Seconds actually spent. 0 means "not measured". */
  actualSeconds: number;
  /** Epoch ms when the running timer started; `null` when not running. */
  startedAt: number | null;
  note: string;
  /** Set when this instance arrived from another day. */
  movedFrom: ISODate | null;
  /** Set when this instance left for another day. */
  movedTo: ISODate | null;
}

export interface Reflection extends Entity {
  date: ISODate;
  promptId: string | null;
  body: string;
  /** Exactly three take-aways. Empty strings are allowed. */
  learnings: string[];
  wordCount: number;
}

export type ShiftStrategy =
  | "move_open_to_next_slot"
  | "move_open_to_day"
  | "swap"
  | "skip_rest";

export interface ShiftMove {
  instanceId: string;
  title: string;
  action: "moved" | "skipped";
  fromDate: ISODate;
  toDate: ISODate;
  fromStart: ClockTime | null;
  toStart: ClockTime | null;
}

/**
 * An auditable record of a reschedule. It doubles as the undo record: store the
 * previous version of everything that changed, plus whatever was created.
 */
export interface ShiftEvent extends Entity {
  date: ISODate;
  strategy: ShiftStrategy;
  reason: string | null;
  moves: ShiftMove[];
  restoreBefore: BlockInstance[];
  createdInstanceIds: string[];
  /** Set once the change has been reversed, so the log stays auditable. */
  undone: boolean;
}

/**
 * How much of a wide window the content column is allowed to use.
 *
 * `comfortable` keeps a book-like measure, `wide` fills a maximised laptop
 * screen, and `full` runs edge to edge for people who want the timeline to use
 * every pixel. The choice is the user's, because the right answer depends on
 * the screen and on how they read.
 */
export type ContentWidth = "comfortable" | "wide" | "full";

export interface Settings {
  locale: Locale;
  theme: ThemePreference;
  weekStart: WeekStart;
  remindersEnabled: boolean;
  /** Clock time at which a day's timeline begins for blocks without a start. */
  dayStart: ClockTime;
  /** Latest clock time a block may be scheduled to start. */
  dayEnd: ClockTime;
  contentWidth: ContentWidth;
  onboardingCompleted: boolean;
  /** Whether the guided tour has been seen through to the end. */
  tourCompleted: boolean;
  activeTemplateId: string | null;
}

export interface Workspace {
  categories: Category[];
  templates: BlockTemplate[];
  instances: BlockInstance[];
  reflections: Reflection[];
  shiftEvents: ShiftEvent[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  locale: "id",
  theme: "system",
  weekStart: 1,
  remindersEnabled: false,
  dayStart: "08:00",
  dayEnd: "21:30",
  contentWidth: "wide",
  onboardingCompleted: false,
  tourCompleted: false,
  activeTemplateId: null,
};
