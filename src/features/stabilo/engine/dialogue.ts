import type { DialogueScript, Intensity, Quiz, SpriteId } from "./types";

/**
 * The phase ladder, kept pure so the whole temperament curve is testable without
 * a browser. Phase 0 is calm; 1–3 are the only steps v1 may reach (tourStabilo
 * §8.2). `full` never changes this ladder — it only unlocks ph4/ph5 outside the
 * tour, which is gated off.
 */
export type Phase = 0 | 1 | 2 | 3;

export const GAUGE_FOR_PHASE: Record<Phase, 0 | 1 | 2 | 3> = { 0: 3, 1: 2, 2: 1, 3: 0 };

export const PHASE_SPRITE: Record<Phase, SpriteId> = {
  0: "flat",
  1: "ph1",
  2: "ph2",
  3: "ph3",
};

export interface DialogueState {
  nodeId: string;
  phase: Phase;
  /** Wrong answers since the last correct one, used for the reaction line. */
  wrongRun: number;
  /** Quiz id → outcome, so a review can see where the user stumbled. */
  answered: Record<string, "ok" | "fail">;
  /** True once the user has been through ph3 and Stabilo handed over a hint. */
  hinted: boolean;
}

export type AnswerOutcome = "correct" | "wrong" | "reset" | "sweet";

export interface AnswerResult {
  state: DialogueState;
  outcome: AnswerOutcome;
}

export function startDialogue(script: DialogueScript): DialogueState {
  return { nodeId: script.start, phase: 0, wrongRun: 0, answered: {}, hinted: false };
}

export function nodeAt(script: DialogueScript, state: DialogueState) {
  return script.nodes[state.nodeId];
}

/** `null` means the script ended, which the host treats as "close quietly". */
export function advance(
  script: DialogueScript,
  state: DialogueState,
  branch: "next" | "unsure" = "next",
): DialogueState | null {
  const node = script.nodes[state.nodeId];
  const target = branch === "unsure" ? (node?.onUnsure ?? node?.next) : node?.next;
  if (!target || !script.nodes[target]) return null;
  return { ...state, nodeId: target };
}

/**
 * Scores one answer.
 *
 * A correct answer steps the phase down by one rather than straight to zero, so
 * recovering feels earned. Three wrong answers in a row reach ph3; the fourth
 * gives up gracefully — the gauge refills and the host reveals the hint. Nobody
 * can be trapped in a quiz, which is the whole point of the ladder.
 *
 * In `sweet` the phase never moves: a wrong answer only earns a softer retry.
 */
export function judge(
  state: DialogueState,
  quiz: Quiz,
  correct: boolean,
  intensity: Intensity,
): AnswerResult {
  const answered = { ...state.answered, [quiz.id]: correct ? "ok" : "fail" } as Record<
    string,
    "ok" | "fail"
  >;

  if (correct) {
    const phase = (state.phase > 0 ? state.phase - 1 : 0) as Phase;
    return { state: { ...state, phase, wrongRun: 0, answered }, outcome: "correct" };
  }

  if (intensity === "sweet") {
    return { state: { ...state, wrongRun: state.wrongRun + 1, answered }, outcome: "sweet" };
  }

  if (state.phase < 3) {
    const phase = (state.phase + 1) as Phase;
    return { state: { ...state, phase, wrongRun: state.wrongRun + 1, answered }, outcome: "wrong" };
  }

  // ph3 already: Stabilo backs off, refills the gauge and offers the answer.
  return {
    state: { ...state, phase: 0, wrongRun: 0, answered, hinted: true },
    outcome: "reset",
  };
}

/** Only meaningful after a reset: the host may show the answer and move on. */
export function hintAvailable(state: DialogueState): boolean {
  return state.hinted;
}

/**
 * Which face to draw.
 *
 * It is not always `state.phase`: in `sweet` the ladder is deliberately frozen,
 * and freezing the drawing with it made a wrong answer look like nothing had
 * happened. Sweet therefore still changes her face — once, after the second
 * miss — and never climbs into the genuinely unsettling frames.
 */
export function visualPhaseFor(state: DialogueState, intensity: Intensity): Phase {
  if (intensity === "sweet") return (state.wrongRun >= 2 ? 1 : 0) as Phase;
  return state.phase;
}

export function correctOption(quiz: Quiz): number {
  return quiz.options.findIndex((option) => option.correct === true);
}

/** Every node pointed at must exist, or the tour would silently stop. */
export function validateScript(script: DialogueScript): string[] {
  const problems: string[] = [];
  if (!script.nodes[script.start]) problems.push(`start:${script.start}`);
  for (const node of Object.values(script.nodes)) {
    for (const key of ["next", "onUnsure"] as const) {
      const target = node[key];
      if (target && !script.nodes[target]) problems.push(`${node.id}.${key}:${target}`);
    }
    if (node.quiz) {
      const correct = node.quiz.options.filter((option) => option.correct).length;
      if (correct !== 1) problems.push(`${node.id}.quiz:${correct}`);
    }
    if (node.ask === "understood" && !node.next && !node.onUnsure) {
      problems.push(`${node.id}.ask:dead-end`);
    }
  }
  return problems;
}
