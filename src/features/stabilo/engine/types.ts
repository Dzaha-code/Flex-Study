import type { Locale, StabiloIntensity } from "@/domain/types";

/**
 * Stabilo's dialogue is data, not UI copy, so it lives beside the feature rather
 * than in `src/i18n`. The interface dictionary keeps its 388 keys; these files
 * hold the character's own words, written separately per language instead of
 * translated line-for-line (tourStabilo.md §14).
 *
 * A script is per-language and holds plain strings, so the engine never has to
 * know which language it is playing. `script/id.ts` and `script/en.ts` share the
 * same node ids; `script/index.ts` picks one.
 */

export type Lang = Locale;

/** Only the sprites that exist in v1. `ph4`/`ph5` belong to the gated module. */
export type SpriteId = "flat" | "scary" | "ph1" | "ph2" | "ph3";

export type EffectId =
  | "tremble1"
  | "tremble2"
  | "tremble3"
  | "glitch"
  | "vignette"
  | "sparkle"
  | "pause";

/** Same union the stored preference uses, so no mapping layer is needed. */
export type Intensity = StabiloIntensity;

export interface QuizOption {
  /** May contain `{{start}}` and friends, resolved at render time. */
  label: string;
  correct?: boolean;
  hint?: string;
}

export interface Quiz {
  id: string;
  /**
   * `point` (click the real element) is deferred to phase 3: it needs hit
   * testing against a live target on another route, which would make the first
   * phase hard to review. Every quiz in v1 is a `choice`.
   */
  kind: "choice";
  prompt: string;
  options: QuizOption[];
}

export interface DialogueNode {
  id: string;
  /** May contain `{{name}}`, `{{start}}` and other UI labels. */
  text: string;
  /** Screen the node lives on; the host navigates there itself. */
  route?: string;
  /** Matches a `data-tour` attribute, exactly like the classic tour. */
  target?: string;
  sprite?: SpriteId;
  fx?: EffectId[];
  /** Whether the accent smile may appear here (12%, max twice per tour). */
  accent?: boolean;
  /** Show the honest "Paham / Belum paham" pair before moving on. */
  ask?: "understood";
  /** Where "Belum paham" leads. Falls through to `next` when absent. */
  onUnsure?: string;
  quiz?: Quiz;
  /** Slower typing for the re-explanation template. */
  slow?: boolean;
  /**
   * Alternate wording per intensity. The sweet version never teases, so a line
   * like the "turn me off" joke needs two versions rather than one sentence
   * with a conditional inside it.
   */
  mode?: Partial<Record<Intensity, string>>;
  next?: string;
}

export interface DialogueScript {
  id: "intro" | "tour";
  lang: Lang;
  start: string;
  nodes: Record<string, DialogueNode>;
}
