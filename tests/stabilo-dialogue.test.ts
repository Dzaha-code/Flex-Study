import { describe, expect, it } from "vitest";
import {
  GAUGE_FOR_PHASE,
  advance,
  correctOption,
  judge,
  startDialogue,
  validateScript,
  visualPhaseFor,
} from "@/features/stabilo/engine/dialogue";
import { interpolate, nameParam } from "@/features/stabilo/engine/text";
import { lipFrame, pauseFor } from "@/features/stabilo/engine/typewriter";
import { INTRO_EN, TOUR_EN, TOUR_EN_EMPTY } from "@/features/stabilo/script/en";
import { INTRO_ID, TOUR_ID, TOUR_ID_EMPTY } from "@/features/stabilo/script/id";
import type { DialogueState } from "@/features/stabilo/engine/dialogue";
import type { DialogueScript } from "@/features/stabilo/engine/types";

/**
 * Two things are being protected here. First, that the script is a graph a user
 * can always get out of: every pointer resolves, every quiz has exactly one
 * right answer, and no node is a dead end. Second, that the temperament ladder
 * behaves as designed â€” three wrong answers reach ph3, the fourth backs off, and
 * "sweet" never escalates at all.
 */

const SCRIPTS: Array<[string, DialogueScript]> = [
  ["intro.id", INTRO_ID],
  ["intro.en", INTRO_EN],
  ["tour.id", TOUR_ID],
  ["tour.en", TOUR_EN],
  ["tour.id.empty", TOUR_ID_EMPTY],
  ["tour.en.empty", TOUR_EN_EMPTY],
];

/** Targets that actually carry `data-tour` in the app. */
const TOUR_TARGETS = new Set([
  "nav",
  "progress",
  "add",
  "focus",
  "streak",
  "recap",
  "shift",
  "week-header",
  "week-grid",
  "week-targets",
  "recap-summary",
  "journal-header",
  "journal-entry",
  "journal-history",
  "settings-appearance",
  "settings-data",
  "settings-templates",
  "settings-custom-templates",
  "settings-stabilo",
  "guide-replay",
  "guide-quick",
  "guide-glossary",
  "first-block",
]);

describe("stabilo scripts", () => {
  it.each(SCRIPTS)("%s has no broken pointers or malformed quizzes", (_name, script) => {
    expect(validateScript(script)).toEqual([]);
  });

  it("uses the same node ids in both languages", () => {
    expect(Object.keys(INTRO_ID.nodes).sort()).toEqual(Object.keys(INTRO_EN.nodes).sort());
    expect(Object.keys(TOUR_ID.nodes).sort()).toEqual(Object.keys(TOUR_EN.nodes).sort());
    expect(Object.keys(TOUR_ID_EMPTY.nodes).sort()).toEqual(Object.keys(TOUR_EN_EMPTY.nodes).sort());
  });

  it("only points at attributes that exist in the app", () => {
    for (const [, script] of SCRIPTS) {
      for (const node of Object.values(script.nodes)) {
        if (node.target) expect(TOUR_TARGETS.has(node.target)).toBe(true);
      }
    }
  });

  it("only the closing node of a flow is allowed to end it", () => {
    const TERMINAL = new Set(["i07", "t08"]);
    for (const [, script] of SCRIPTS) {
      for (const node of Object.values(script.nodes)) {
        const hasExit = Boolean(node.next || node.onUnsure);
        expect(hasExit || TERMINAL.has(node.id)).toBe(true);
      }
    }
  });

  it("keeps every line inside the two-line budget", () => {
    for (const [, script] of SCRIPTS) {
      for (const node of Object.values(script.nodes)) {
        expect(node.text.length).toBeLessThanOrEqual(90);
        for (const variant of Object.values(node.mode ?? {})) {
          expect(variant.length).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it("has exactly one correct answer per quiz", () => {
    for (const [, script] of SCRIPTS) {
      for (const node of Object.values(script.nodes)) {
        if (!node.quiz) continue;
        expect(correctOption(node.quiz)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("answer ladder", () => {
  function firstQuiz(script: DialogueScript) {
    const node = Object.values(script.nodes).find((entry) => entry.quiz);
    if (!node?.quiz) throw new Error("no quiz in script");
    return node.quiz;
  }

  it("walks ph1 â†’ ph2 â†’ ph3 on three wrong answers", () => {
    const quiz = firstQuiz(TOUR_ID);
    let state = startDialogue(TOUR_ID);

    const first = judge(state, quiz, false, "spooky");
    expect(first.outcome).toBe("wrong");
    expect(first.state.phase).toBe(1);
    expect(GAUGE_FOR_PHASE[first.state.phase]).toBe(2);

    state = first.state;
    const second = judge(state, quiz, false, "spooky");
    expect(second.state.phase).toBe(2);

    state = second.state;
    const third = judge(state, quiz, false, "spooky");
    expect(third.state.phase).toBe(3);
    expect(GAUGE_FOR_PHASE[third.state.phase]).toBe(0);
  });

  it("backs off instead of escalating past ph3", () => {
    const quiz = firstQuiz(TOUR_ID);
    let state: DialogueState = { ...startDialogue(TOUR_ID), phase: 3 };

    const fourth = judge(state, quiz, false, "spooky");
    expect(fourth.outcome).toBe("reset");
    expect(fourth.state.phase).toBe(0);
    expect(fourth.state.hinted).toBe(true);
    state = fourth.state;
    expect(state.hinted).toBe(true);
  });

  it("steps down one phase per correct answer", () => {
    const quiz = firstQuiz(TOUR_ID);
    let state: DialogueState = { ...startDialogue(TOUR_ID), phase: 3 };

    state = judge(state, quiz, true, "spooky").state;
    expect(state.phase).toBe(2);

    state = judge(state, quiz, true, "spooky").state;
    expect(state.phase).toBe(1);

    state = judge(state, quiz, true, "spooky").state;
    expect(state.phase).toBe(0);
  });

  it("never escalates in sweet mode", () => {
    const quiz = firstQuiz(TOUR_ID);
    let state = startDialogue(TOUR_ID);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = judge(state, quiz, false, "sweet");
      expect(result.outcome).toBe("sweet");
      expect(result.state.phase).toBe(0);
      state = result.state;
    }
  });

  it("records quiz outcomes without touching the phase on success", () => {
    const quiz = firstQuiz(TOUR_ID);
    const result = judge(startDialogue(TOUR_ID), quiz, true, "spooky");
    expect(result.state.answered[quiz.id]).toBe("ok");
    expect(result.state.phase).toBe(0);
  });
});

describe("navigation", () => {
  it("advances along next and ends cleanly", () => {
    let state = startDialogue(TOUR_ID);
    let guard = 0;

    while (guard < 100) {
      const next = advance(TOUR_ID, state);
      if (!next) break;
      state = next;
      guard += 1;
    }

    expect(guard).toBeGreaterThan(5);
    expect(TOUR_ID.nodes[state.nodeId]?.next).toBeUndefined();
  });

  it("takes the unsure branch when one is declared", () => {
    const state = { ...startDialogue(TOUR_ID), nodeId: "t02" };
    const next = advance(TOUR_ID, state, "unsure");
    expect(next?.nodeId).toBe("t02b");
  });

  it("falls back to next when a node has no unsure branch", () => {
    const state = { ...startDialogue(TOUR_ID), nodeId: "t05" };
    const next = advance(TOUR_ID, state, "unsure");
    expect(next?.nodeId).toBe("q3");
  });
});

describe("interpolation", () => {
  it("fills double-brace tokens only", () => {
    expect(interpolate("Halo{{name}}~", { name: ", Rani" })).toBe("Halo, Rani~");
    expect(interpolate("Halo {name}~", { name: ", Rani" })).toBe("Halo {name}~");
  });

  it("leaves unknown tokens visible rather than blank", () => {
    expect(interpolate("{{nama}}", { name: "x" })).toBe("{{nama}}");
  });

  it("builds a greeting that survives an empty name", () => {
    expect(nameParam("Rani")).toBe(", Rani");
    expect(nameParam("   ")).toBe("");
  });
});

describe("expression", () => {
  it("follows the ladder in spooky mode", () => {
    const base = startDialogue(TOUR_ID);
    expect(visualPhaseFor({ ...base, phase: 0 }, "spooky")).toBe(0);
    expect(visualPhaseFor({ ...base, phase: 2 }, "spooky")).toBe(2);
    expect(visualPhaseFor({ ...base, phase: 3 }, "spooky")).toBe(3);
  });

  it("still reacts in sweet mode, but never climbs past the first step", () => {
    const base = startDialogue(TOUR_ID);
    expect(visualPhaseFor({ ...base, wrongRun: 0 }, "sweet")).toBe(0);
    expect(visualPhaseFor({ ...base, wrongRun: 1 }, "sweet")).toBe(0);
    expect(visualPhaseFor({ ...base, wrongRun: 2 }, "sweet")).toBe(1);
    expect(visualPhaseFor({ ...base, wrongRun: 9 }, "sweet")).toBe(1);
  });
});

describe("lip flap", () => {
  it("opens on a vowel and closes otherwise", () => {
    expect(lipFrame("closed", "a")).toBe("open");
    expect(lipFrame("open", "a")).toBe("closed");
    expect(lipFrame("open", "k")).toBe("closed");
  });

  it("pauses longer after a sentence than after a comma", () => {
    expect(pauseFor(".")).toBe(180);
    expect(pauseFor(",")).toBe(90);
    expect(pauseFor("k")).toBe(0);
  });
});
