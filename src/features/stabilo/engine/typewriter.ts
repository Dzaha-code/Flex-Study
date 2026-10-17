/**
 * Typing and lip-flap, with no React and no DOM.
 *
 * The mouth alternates only on vowels, otherwise it closes: that reads as speech
 * at a glance and costs one frame swap instead of an animation. Punctuation
 * earns a longer beat, which is what makes the line feel spoken rather than
 * printed (tourStabilo.md §5.3).
 */

export type Mouth = "closed" | "open";

export const TYPE_MS = 30;
/** The re-explanation template types slower on purpose. */
export const TYPE_MS_SLOW = 38;

const VOWEL = /[aiueoAIUEO]/;
const SENTENCE_END = /[.!?…]/;
const CLAUSE_END = /[,;:]/;

export function lipFrame(previous: Mouth, char: string): Mouth {
  if (VOWEL.test(char)) return previous === "open" ? "closed" : "open";
  return "closed";
}

export function pauseFor(char: string): number {
  if (SENTENCE_END.test(char)) return 180;
  if (CLAUSE_END.test(char)) return 90;
  return 0;
}

export interface SpeakOptions {
  ms?: number;
  signal: AbortSignal;
  onChar: (index: number) => void;
  onFrame: (frame: Mouth) => void;
}

/**
 * Resolves when the line is fully typed, or immediately when aborted. Callers
 * use the abort path for "user clicked to finish the line", so the promise is
 * always safe to await.
 */
export function speak(text: string, options: SpeakOptions): Promise<void> {
  const ms = options.ms ?? TYPE_MS;

  return new Promise<void>((resolve) => {
    let index = 0;
    let frame: Mouth = "closed";

    const tick = () => {
      if (options.signal.aborted || index >= text.length) {
        options.onFrame("closed");
        resolve();
        return;
      }
      const char = text.charAt(index);
      index += 1;
      frame = lipFrame(frame, char);
      options.onFrame(frame);
      options.onChar(index);
      window.setTimeout(tick, ms + pauseFor(char));
    };

    tick();
  });
}

/** No animation: the reduced-motion path shows the whole line at once. */
export function speakInstant(
  text: string,
  options: Pick<SpeakOptions, "signal" | "onChar" | "onFrame">,
): Promise<void> {
  options.onChar(text.length);
  options.onFrame("closed");
  return Promise.resolve();
}
