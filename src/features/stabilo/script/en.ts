import type { DialogueScript } from "../engine/types";

/**
 * English script. Written as speech, not translated from the Indonesian file:
 * contractions and a light teasing tone carry the voice, and literal renderings
 * of "lho"/"ya~" would read as broken English.
 *
 * Node ids match `id.ts` exactly, so the two can be checked against each other
 * in a test instead of being trusted by eye.
 */

export const INTRO_EN: DialogueScript = {
  id: "intro",
  lang: "en",
  start: "i01",
  nodes: {
    i01: {
      id: "i01",
      text: "Hello, hello~ We finally meet! I'm Stabilo, FlexStudy's resident guide.",
      next: "i02",
    },
    i02: {
      id: "i02",
      text: "What should I call you? You can leave it blank, too.",
      next: "i03",
    },
    i03: {
      id: "i03",
      text: "Nice to meet you{{name}}~ ✿",
      fx: ["sparkle"],
      next: "i04",
    },
    i04: {
      id: "i04",
      text: "One more thing: do you want me super sweet, or with a little... spice?",
      next: "i05",
    },
    i05: {
      id: "i05",
      text: "FlexStudy forgives. Your day becomes blocks, and when it gets messy, you shift them.",
      next: "i06",
    },
    i06: {
      id: "i06",
      text: "Now pick the template that looks most like your life~",
      next: "i07",
    },
    i07: {
      id: "i07",
      text: "I'll be right there. Call me if you get stuck~",
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
      text: "This is the main menu. You'll mostly hang out in {{today}}.",
      ask: "understood",
      onUnsure: "t01b",
      next: "t02",
    },
    t01b: {
      id: "t01b",
      route: "/",
      target: "nav",
      slow: true,
      text: "The menu is on the left. The one you'll open most: {{today}}.",
      next: "t02",
    },
    t02: {
      id: "t02",
      route: "/",
      target: "focus",
      text: "Your first block is here. Press {{start}} and the timer starts right away.",
      ask: "understood",
      onUnsure: "t02b",
      next: "q1",
    },
    t02b: {
      id: "t02b",
      route: "/",
      target: "focus",
      slow: true,
      text: "This is the running block. The {{start}} button lives inside it.",
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
      text: "This line shows how many blocks you've finished today.",
      ask: "understood",
      onUnsure: "t03b",
      next: "t04",
    },
    t03b: {
      id: "t03b",
      route: "/",
      target: "progress",
      slow: true,
      text: "That line up there is today's progress.",
      next: "t04",
    },
    t04: {
      id: "t04",
      route: "/",
      target: "shift",
      text: "If today gets messy, use {{shift}}: the rest moves, your targets stay safe.",
      ask: "understood",
      onUnsure: "t04b",
      next: "q2",
    },
    t04b: {
      id: "t04b",
      route: "/",
      target: "shift",
      slow: true,
      text: "The {{shift}} button moves what's left. Targets don't drop with it.",
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
          { label: "Pretend I didn't see" },
        ],
      },
      next: "t05",
    },
    t05: {
      id: "t05",
      route: "/week",
      target: "week-targets",
      accent: true,
      text: "In {{week}} you can see targets per category. Slow is fine, consistency wins.",
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
      text: "In {{journal}}, two sentences are enough. I love it when you tell me about your day~",
      next: "t07",
    },
    t07: {
      id: "t07",
      route: "/settings",
      target: "settings-appearance",
      text: "If you prefer it without me, switch me off in {{settings}} → Stabilo.",
      mode: {
        sweet: "Switch me off in {{settings}} → Stabilo if you like. I won't be mad, promise.",
        spooky:
          "Switch me off in {{settings}} → Stabilo if you like. I won't be mad... probably. Hehe.",
      },
      accent: true,
      next: "t08",
    },
    t08: {
      id: "t08",
      route: "/guide",
      target: "guide-quick",
      text: "That's all. If you forget, call me from {{guide}}. Happy studying~ ✿",
      fx: ["sparkle"],
    },
  },
};
