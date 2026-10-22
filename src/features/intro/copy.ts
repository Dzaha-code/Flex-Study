/**
 * Intro copy (INTRO-ANIMATION.md §3).
 *
 * Kept out of the i18n dictionary on purpose: this is a fixed, once-only brand
 * moment rather than app chrome, and `Intro.tsx` measures the DOM it produces.
 * Adding a key to the shared dictionary would invite translation drift in a
 * screen whose timings are tuned to these exact strings.
 */
export type IntroLang = "id" | "en";

export interface IntroCopy {
  /** Line 1 — answers the ring that just broke. */
  l1: string;
  /** Line 2, before the highlighted words. */
  l2a: string;
  /** The highlighted words; the stabilo sweeps across exactly these. */
  hl: string;
  /** Line 2, after the highlighted words. */
  l2b: string;
  note: string;
  /**
   * Shown in place of the note when the animation is deliberately static, so a
   * still opening reads as a setting instead of a broken build.
   */
  reduced: string;
  /**
   * The link that accompanies it: knowing *why* it is still should lead straight
   * to the control (updateBrief.md §3.1, "tautan ke Atur").
   */
  reducedAction: string;
  skip: string;
  /** Accessible name for the dialog. */
  dialog: string;
  /** `aria-label` for the wordmark, which is split into individual letters. */
  wordmark: string;
}

export const COPY: Record<IntroLang, IntroCopy> = {
  id: {
    l1: "Belajar bukan soal sempurna.",
    l2a: "Soal ",
    hl: "kembali lagi",
    l2b: ".",
    note: "Tanpa akun · Datamu tetap di perangkatmu",
    reduced: "Animasi dikurangi karena pengaturan sistem.",
    reducedAction: "Buka Atur → Tampilan",
    skip: "Lewati",
    dialog: "Pengantar FlexStudy",
    wordmark: "FlexStudy",
  },
  en: {
    l1: "Learning isn't about being perfect.",
    l2a: "It's about ",
    hl: "coming back",
    l2b: ".",
    note: "No account · Your data stays on your device",
    reduced: "Animation reduced by your system settings.",
    reducedAction: "Open Settings → Appearance",
    skip: "Skip",
    dialog: "Introducing FlexStudy",
    wordmark: "FlexStudy",
  },
};
