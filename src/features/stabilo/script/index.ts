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
    correct: "Betul! Pintar~ ✿",
    wrong1: "Hehe. Bukan yang itu, lho~",
    wrong2: "...Kamu dengerin aku, kan? Kan...?",
    wrong3: "Aduh, aduh, ADUH! Tiga kali, lho!!",
    reset:
      "...Hhh. Maaf, aku kebawa suasana. Kita ulang pelan-pelan, ya? Aku kasih petunjuk deh.",
    sweet: "Hmm, bukan yang itu~ Coba lagi?",
    skipped: "Oke, kapan-kapan ya~ Aku di sini kalau kamu butuh.",
    unsure: "Nggak apa-apa! Aku jelasin lebih pelan.",
  },
  en: {
    correct: "Correct! Nice one~ ✿",
    wrong1: "Hehe. That's not the one, you know~",
    wrong2: "...You're listening to me, right? Right...?",
    wrong3: "Ugh, ugh, UGH! That's three times!!",
    reset: "...Hah. Sorry, I got carried away. Let's go again, slowly, okay? I'll give you a hint.",
    sweet: "Hmm, not that one~ Try again?",
    skipped: "Okay, another time~ I'll be here if you need me.",
    unsure: "No worries! I'll go slower.",
  },
};

/** Which line to show for a wrong answer at each step of the ladder. */
export function wrongLine(reactions: Reactions, phase: number): string {
  if (phase <= 1) return reactions.wrong1;
  if (phase === 2) return reactions.wrong2;
  return reactions.wrong3;
}
