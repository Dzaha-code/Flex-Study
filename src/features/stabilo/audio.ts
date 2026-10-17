/**
 * Short interface sounds for Stabilo.
 *
 * Everything is lazy: nothing is fetched until a clip is actually played, so a
 * user who keeps sound off pays zero bytes and zero decoders. Playback is always
 * best-effort — a blocked autoplay must stay silent, never throw.
 *
 * Files and their CC0 provenance: `public/audio/LICENSE.txt`.
 */

export type SoundLevel = "off" | "soft" | "normal";

const CLIPS = {
  advance: "/audio/ui-advance.ogg",
  correct: "/audio/quiz-correct.ogg",
  wrong: "/audio/quiz-wrong.ogg",
  glitch: "/audio/phase-glitch.ogg",
  appear: "/audio/appear.ogg",
} as const;

export type ClipName = keyof typeof CLIPS;

/**
 * Deliberately quiet. These sit under a voice-free interface, and the brief asks
 * for the softest option to be usable in a classroom.
 */
const VOLUME: Record<SoundLevel, number> = { off: 0, soft: 0.35, normal: 0.7 };

const cache = new Map<ClipName, HTMLAudioElement>();

export function clipVolume(level: SoundLevel): number {
  return VOLUME[level];
}

export function playClip(name: ClipName, level: SoundLevel): void {
  if (typeof window === "undefined") return;
  const volume = VOLUME[level];
  if (volume === 0) return;

  let element = cache.get(name);
  if (!element) {
    element = new window.Audio(CLIPS[name]);
    element.preload = "auto";
    cache.set(name, element);
  }

  element.volume = volume;
  try {
    element.currentTime = 0;
  } catch {
    /* Not yet seekable; playing from the start is fine. */
  }
  void element.play().catch(() => {
    /* Autoplay blocked before the first gesture: stay silent. */
  });
}
