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

/**
 * How often the opening animation plays.
 *
 * `once` is the default and the behaviour the app shipped with: the first launch
 * after install. `always` plays it on every launch, `off` never plays it. The
 * three states exist rather than a plain on/off switch so that turning the
 * animation off stays a deliberate choice instead of the unconfigured default.
 */
export type IntroPreference = "once" | "always" | "off";

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
  /**
   * When the note text last changed. Optional: rows written before this field
   * existed still load, and a note that has never been edited simply has no
   * value to show.
   */
  noteUpdatedAt?: string;
  /** Set when this instance arrived from another day. */
  movedFrom: ISODate | null;
  /** Set when this instance left for another day. */
  movedTo: ISODate | null;
}

export interface Reflection extends Entity {
  date: ISODate;
  /** Optional headline. When empty, the date is the heading. */
  title: string;
  promptId: string | null;
  body: string;
  /** Exactly three take-aways. Empty strings are allowed. */
  learnings: string[];
  wordCount: number;
  /** Marked by hand as a day worth remembering. */
  favorite: boolean;
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
 * An auditable record of applying a different template (updateBrief.md §3.5).
 *
 * Same contract as `ShiftEvent`: copies of every row that was removed, the ids
 * of every row that was created, and an `undone` flag so the log survives its
 * own reversal. `previousTemplateId` carries the active template before the
 * switch, because an undo that restored the blocks but kept pointing at the
 * new plan would be half a lie.
 */
export interface TemplateSwitchEvent extends Entity {
  /** The first day the new plan took over. */
  date: ISODate;
  /** `null` when no template was active before (a first apply). */
  previousTemplateId: string | null;
  replacedIds: string[];
  restoreBefore: BlockInstance[];
  createdInstanceIds: string[];
  /**
   * The plan as it was before the switch, in full — the block templates and
   * categories the apply replaced wholesale. Restoring instances alone would
   * leave rows pointing at template and category ids that no longer exist,
   * which is both the "orphaned history" the brief forbids and a guarantee
   * that the next ensureRange materialises duplicate blocks beside them.
   */
  previousTemplates: BlockTemplate[];
  previousCategories: Category[];
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

/**
 * Three answers to one question: should this device animate?
 *
 * `system` is the default and never guesses; the two explicit values exist
 * because the system signal is often an accident of a performance setting.
 */
export type AnimationPreference = "system" | "full" | "reduced";

export interface Settings {
  locale: Locale;
  theme: ThemePreference;
  /** When the opening animation plays. Mirrored to `localStorage` for boot. */
  intro: IntroPreference;
  /**
   * How motion is decided across the whole app.
   *
   * `system` follows `prefers-reduced-motion`, which is the honest default —
   * a machine that asks for less motion should get it. But Windows reports
   * `reduce` for reasons nobody chose (animation effects off, a "best
   * performance" profile, Remote Desktop), and someone who turned those off for
   * speed did not ask for a still app. `full` and `reduced` let them say so.
   */
  animation: AnimationPreference;
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

/**
 * How much of Stabilo the user wants. `full` unlocks the gated phase-4 module
 * and is never offered while `STABILO_FULL_HORROR` is false.
 */
export type StabiloIntensity = "sweet" | "spooky" | "full";

/**
 * Stabilo's own preferences and progress.
 *
 * Kept in the `meta` table under one key rather than as new Dexie tables: this
 * is a single small row, and adding an index for it would force a storage
 * migration for no query benefit.
 */
export interface StabiloPrefs {
  enabled: boolean;
  intensity: StabiloIntensity;
  /** Trembling, glitch and sudden movement. */
  fx: boolean;
  /**
   * Keeps her motion even when the system asks for reduced motion.
   *
   * Off by default: the OS preference is the honest default, and a machine
   * that reports `reduce` by accident should not be overridden behind the
   * user's back. This is only ever set from Settings.
   */
  forceMotion: boolean;
  /** Off by default: nothing makes noise until the user asks for it. */
  sound: "off" | "soft" | "normal";
  nickname: string;
  introSeen: boolean;
  tourDone: boolean;
  ph3Seen: number;
  progress: { nodeId: string; phase: 0 | 1 | 2 | 3 } | null;
}

/**
 * Defaults for a fresh install. Stabilo starts enabled because the whole first
 * run depends on her being there; `sweet` and `off` are one tap away in Atur.
 */
export const DEFAULT_STABILO_PREFS: StabiloPrefs = {
  enabled: true,
  intensity: "spooky",
  fx: true,
  forceMotion: false,
  sound: "normal",
  nickname: "",
  introSeen: false,
  tourDone: false,
  ph3Seen: 0,
  progress: null,
};

/**
 * A template saved from the user's own plan.
 *
 * Blocks reference their category by index rather than by id: the categories are
 * re-created with fresh ids every time the template is applied, so an id would
 * point at a row that no longer exists.
 */
export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  categories: Array<{
    name: string;
    icon: CategorySymbol;
    weeklyTargetMinutes: number;
  }>;
  blocks: Array<{
    title: string;
    categoryIndex: number;
    durationMin: number;
    /** 0 = Sunday … 6 = Saturday. */
    days: number[];
    plannedStart: ClockTime | null;
  }>;
}

export interface Workspace {
  categories: Category[];
  templates: BlockTemplate[];
  instances: BlockInstance[];
  reflections: Reflection[];
  shiftEvents: ShiftEvent[];
  /**
   * Optional for the same reason as `customTemplates`: a backup exported before
   * template switches were recorded must still import. An old export simply has
   * no switch log to restore.
   */
  switchEvents?: TemplateSwitchEvent[];
  settings: Settings;
  /**
   * Optional so a backup exported before Stabilo existed still imports. Losing
   * a nickname on restore would be a small betrayal, so it travels with the
   * export instead of staying trapped on one machine.
   */
  stabilo?: StabiloPrefs;
  /** Optional for the same reason as `stabilo`: older exports must still import. */
  customTemplates?: CustomTemplate[];
}

export const DEFAULT_SETTINGS: Settings = {
  // English is the shipping default. The language screen still asks once, and a
  // stored choice always wins; this only decides the state before that answer.
  locale: "en",
  theme: "system",
  // The opening animation plays on every launch by default; `once` stays
  // available in Settings, and old backups without the field still import as
  // `once` because the schema default did not change.
  intro: "always",
  // Following the system is the only default that cannot be wrong about
  // someone's needs; the explicit values are opt-in, not pre-chosen.
  animation: "system",
  weekStart: 1,
  remindersEnabled: false,
  dayStart: "08:00",
  dayEnd: "21:30",
  contentWidth: "wide",
  onboardingCompleted: false,
  tourCompleted: false,
  activeTemplateId: null,
};
