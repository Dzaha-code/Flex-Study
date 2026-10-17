import type { IntroPreference } from "@/domain/types";

/**
 * Whether the opening animation should play.
 *
 * A pure function in its own module, away from the React gate, so the decision
 * can be unit tested: the gate reads `localStorage` and cannot be rendered in
 * the node test environment, but this is where its whole judgement lives.
 */
export type IntroPhase = "run" | "done";

/** What an install that has never been configured uses: the first launch only. */
export const DEFAULT_INTRO_MODE: IntroPreference = "always";

/**
 * Storage keys. They sit next to the decision rather than in the gate component
 * so the settings screen can reach them without importing React components —
 * and with them the intro's own chunk and stylesheet.
 */
/** Written when the animation has been watched through or skipped. */
export const INTRO_SEEN_KEY = "fs.intro.v1";
/** A one-shot request to play the animation on the next boot, whatever the mode. */
export const INTRO_FORCE_KEY = "fs.intro.force";

/**
 * `seen` is the record that the animation has been watched through or skipped.
 * It only decides the outcome for `once` — `always` ignores it, and `off` never
 * plays the animation at all, not even on the very first launch.
 *
 * `forced` outranks the preference, because it can only be set by the "play it
 * now" button: someone who has just asked to watch the animation is not served
 * by being told their mode is `off`.
 */
export function resolveIntroPhase(
  mode: IntroPreference,
  seen: boolean,
  forced = false,
): IntroPhase {
  if (forced) return "run";
  if (mode === "off") return "done";
  if (mode === "always") return "run";
  return seen ? "done" : "run";
}
