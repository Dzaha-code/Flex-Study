import type { Lang } from "../engine/types";
import type { DialogueScript } from "../engine/types";
import { INTRO_EN, TOUR_EN } from "./en";
import { INTRO_ID, TOUR_ID } from "./id";

export type Flow = "intro" | "tour";

const SCRIPTS: Record<Lang, Record<Flow, DialogueScript>> = {
  id: { intro: INTRO_ID, tour: TOUR_ID },
  en: { intro: INTRO_EN, tour: TOUR_EN },
};

export function scriptFor(flow: Flow, lang: Lang): DialogueScript {
  return SCRIPTS[lang][flow];
}

/**
 * Reaction lines, kept beside the scripts rather than in the UI dictionary: they
 * are Stabilo speaking, not interface copy.
 */
export interface Reactions {
  correct: string;
  wrong1: string;
  wrong2: string;
  wrong3: string;
  reset: string;
  sweet: string;
  skipped: string;
  unsure: string;
}

export const REACTIONS: Record<Lang, Reactions> = {
  id: {
    correct: "Betul! ✿",
    wrong1: "Hehe, bukan itu~",
    wrong2: "Kamu dengerin aku, kan?",
    wrong3: "Aduh. Tiga kali, lho.",
    reset: "Hhh. Maaf, aku kebawa. Kita ulang pelan-pelan, ya.",
    sweet: "Hmm, bukan itu~ Coba lagi?",
    skipped: "Oke, kapan-kapan ya.",
    unsure: "Nggak apa-apa, aku ulangi.",
  },
  en: {
    correct: "Correct! ✿",
    wrong1: "Hehe, not that one~",
    wrong2: "You're listening, right?",
    wrong3: "Ugh. Three times, you know.",
    reset: "Hah. Sorry, I got carried away. Let's take it slow.",
    sweet: "Hmm, not that one~ Try again?",
    skipped: "Okay, another time.",
    unsure: "No worries, I'll repeat.",
  },
};

/** Which line to show for a wrong answer at each step of the ladder. */
export function wrongLine(reactions: Reactions, phase: number): string {
  if (phase <= 1) return reactions.wrong1;
  if (phase === 2) return reactions.wrong2;
  return reactions.wrong3;
}
