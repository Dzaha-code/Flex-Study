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

export type CategoryIcon =
  | "book"
  | "briefcase"
  | "notebook"
  | "language"
  | "heart"
  | "run"
  | "sparkle"
  | "clock";

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface Category extends Entity {
  name: string;
  icon: CategoryIcon;
  /** Categories are told apart by icon, label and line pattern — never by hue. */
  linePattern: LinePattern;
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

export interface Settings {
  locale: Locale;
  theme: ThemePreference;
  weekStart: WeekStart;
  remindersEnabled: boolean;
  /** Clock time at which a day's timeline begins for blocks without a start. */
  dayStart: ClockTime;
  /** Latest clock time a block may be scheduled to start. */
  dayEnd: ClockTime;
  onboardingCompleted: boolean;
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
  onboardingCompleted: false,
  activeTemplateId: null,
};
