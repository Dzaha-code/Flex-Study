import type { DialogueScript } from "../engine/types";

/**
 * English script. Written as speech, not as a translation of the Indonesian
 * file: short sentences, contractions, and no colon-led lists.
 * Node ids match `id.ts` exactly; a test keeps them in step.
 */

export const INTRO_EN: DialogueScript = {
  id: "intro",
  lang: "en",
  start: "i01",
  nodes: {
    i01: {
      id: "i01",
      text: "Hi! There you are. I'm Stabilo, the one who keeps an eye on FlexStudy.",
      next: "i02",
    },
    i02: {
      id: "i02",
      text: "Before we start, what should I call you?",
      input: "nickname",
      next: "i03",
    },
    i03: {
      id: "i03",
      text: "Good to meet you{{name}}~ ✿",
      fx: ["sparkle"],
      next: "i04",
    },
    i04: {
      id: "i04",
      text: "Do you want me sweet, or a little bit wicked?",
      pick: "intensity",
      next: "i05",
    },
    i05: {
      id: "i05",
      text: "FlexStudy is a schedule that forgives. When your day falls apart, you just move it.",
      next: "i06",
    },
    i06: {
      id: "i06",
      text: "Now pick the template that looks most like your life.",
      next: "i07",
    },
    i07: {
      id: "i07",
      text: "I'll be right there. Call me if you get stuck.",
      fx: ["sparkle"],
    },
  },
};

export const TOUR_EN: DialogueScript = {
  id: "tour",
  lang: "en",
  start: "t01",
  nodes: {
    t01: {
      id: "t01",
      route: "/",
      target: "nav",
      text: "The menu. You'll open {{today}} most mornings.",
      next: "t02",
    },
    t02: {
      id: "t02",
      route: "/",
      target: "focus",
      text: "Your first block is here. {{start}} turns the timer on.",
      ask: "understood",
      onUnsure: "t02b",
      next: "q1",
    },
    t02b: {
      id: "t02b",
      route: "/",
      target: "focus",
      slow: true,
      text: "Look at this block. The {{start}} button is inside it.",
      next: "q1",
    },
    q1: {
      id: "q1",
      route: "/",
      target: "focus",
      text: "Wait a second!",
      fx: ["pause"],
      quiz: {
        id: "quiz-start",
        kind: "choice",
        prompt: "To start the timer, which one do you press?",
        options: [
          { label: "{{start}}", correct: true },
          { label: "{{finish}}" },
          { label: "{{skip}}" },
        ],
      },
      next: "t03",
    },
    t03: {
      id: "t03",
      route: "/",
      target: "progress",
      text: "This line fills in as blocks finish.",
      next: "t04",
    },
    t04: {
      id: "t04",
      route: "/",
      target: "shift",
      text: "Messy day? Use {{shift}}. The rest moves, your targets stay.",
      ask: "understood",
      onUnsure: "t04b",
      next: "q2",
    },
    t04b: {
      id: "t04b",
      route: "/",
      target: "shift",
      slow: true,
      text: "{{shift}} moves what's left. Your targets don't drop.",
      next: "q2",
    },
    q2: {
      id: "q2",
      route: "/",
      target: "shift",
      text: "Wait a second!",
      fx: ["pause"],
      quiz: {
        id: "quiz-shift",
        kind: "choice",
        prompt: "Today isn't going to fit. What do you choose?",
        options: [
          { label: "{{shift}}", correct: true },
          { label: "Delete every block" },
          { label: "Ignore it" },
        ],
      },
      next: "t05",
    },
    t05: {
      id: "t05",
      route: "/week",
      target: "week-targets",
      accent: true,
      text: "{{week}} is where the targets live.",
      next: "q3",
    },
    q3: {
      id: "q3",
      route: "/week",
      target: "week-targets",
      text: "Wait a second!",
      fx: ["pause"],
      quiz: {
        id: "quiz-week",
        kind: "choice",
        prompt: "Which screen shows this week's targets?",
        options: [
          { label: "{{week}}", correct: true },
          { label: "{{journal}}" },
          { label: "{{settings}}" },
        ],
      },
      next: "t06",
    },
    t06: {
      id: "t06",
      route: "/journal",
      target: "journal-entry",
      text: "Two sentences in {{journal}} are enough at night.",
      next: "t07",
    },
    t07: {
      id: "t07",
      route: "/settings",
      target: "settings-appearance",
      text: "If you're tired of me, switch me off in {{settings}}.",
      mode: {
        sweet: "You can switch me off in {{settings}} if you like. I won't mind.",
        spooky: "Tired of me? Switch me off in {{settings}}. I won't be mad... probably.",
      },
      accent: true,
      next: "t08",
    },
    t08: {
      id: "t08",
      route: "/guide",
      target: "guide-quick",
      text: "That's it. Call me from {{guide}} if you forget.",
      fx: ["sparkle"],
    },
  },
};
