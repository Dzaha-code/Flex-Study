import { weekdayIndex } from "./time";
import { SCHEMA_VERSION } from "./types";
import type { Reflection } from "./types";

/** Rotating prompts. Generic on purpose: the system knows nothing about UTBK. */
export const REFLECTION_PROMPT_IDS = [
  "reflection.prompt.win",
  "reflection.prompt.friction",
  "reflection.prompt.tomorrow",
  "reflection.prompt.energy",
  "reflection.prompt.learning",
] as const;

export type ReflectionPromptId = (typeof REFLECTION_PROMPT_IDS)[number];

export const LEARNING_SLOTS = 3;

/** Stable per date, so the prompt does not change while the user is typing. */
export function promptIdForDate(iso: string): ReflectionPromptId {
  return REFLECTION_PROMPT_IDS[weekdayIndex(iso) % REFLECTION_PROMPT_IDS.length];
}

/**
 * Word count for the journal. Latin script only, which covers both shipped
 * locales, and keeps the counter predictable while typing.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).filter((token) => /[0-9A-Za-zÀ-ÿ]/.test(token)).length;
}

/** Always exactly three slots, trimmed, never undefined. */
export function normalizeLearnings(input: readonly string[]): string[] {
  return Array.from({ length: LEARNING_SLOTS }, (_, index) => (input[index] ?? "").trim());
}

export interface ReflectionDraft {
  date: string;
  body: string;
  learnings: readonly string[];
  promptId: string | null;
  existing?: Reflection | null;
  now: number;
  newId: (prefix: string) => string;
}

export function makeReflection(draft: ReflectionDraft): Reflection {
  const stamp = new Date(draft.now).toISOString();
  return {
    id: draft.existing?.id ?? draft.newId("refl"),
    date: draft.date,
    promptId: draft.promptId,
    body: draft.body,
    learnings: normalizeLearnings(draft.learnings),
    wordCount: countWords(draft.body),
    createdAt: draft.existing?.createdAt ?? stamp,
    updatedAt: stamp,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function hasContent(reflection: Pick<Reflection, "body" | "learnings">): boolean {
  if (reflection.body.trim() !== "") return true;
  return reflection.learnings.some((item) => item.trim() !== "");
}

/** One-line preview for the journal list. */
export function reflectionPreview(body: string, maxLength = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
}
