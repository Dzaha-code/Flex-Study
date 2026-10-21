/**
 * A short, in-memory record of what the opening animation actually did.
 *
 * The report was "the animation stops suddenly", and each hypothesis for it ends
 * in a different branch: reduced motion (static lockup), an exception swallowed
 * by the catch, a stray click on the backdrop, a slow GSAP chunk. Guessing
 * between them is not diagnosis — this records which branch ran and when, so one
 * launch on the affected machine settles it.
 *
 * Off by default. Enabled by `fs.intro.debug` in `localStorage` or `?introDebug=1`;
 * when on, the intro paints the log in a corner, because the release build ships
 * without devtools.
 */
export const INTRO_DEBUG_KEY = "fs.intro.debug";

export interface IntroLogEntry {
  /** Milliseconds since page load, so the numbers are comparable across runs. */
  at: number;
  event: string;
  detail?: string;
}

const MAX_ENTRIES = 40;
const entries: IntroLogEntry[] = [];

/** Tiny store: `useSyncExternalStore` in the intro reads the flag through this. */
const debugListeners = new Set<() => void>();

export function subscribeIntroDebug(listener: () => void): () => void {
  debugListeners.add(listener);
  return () => void debugListeners.delete(listener);
}

export function introDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(INTRO_DEBUG_KEY) === "1") return true;
    return new URLSearchParams(window.location.search).get("introDebug") === "1";
  } catch {
    return false;
  }
}

export function setIntroDebug(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(INTRO_DEBUG_KEY, "1");
    else localStorage.removeItem(INTRO_DEBUG_KEY);
  } catch {
    /* Storage blocked: the debug log simply stays off. */
  }
  debugListeners.forEach((listener) => listener());
}

export function logIntro(event: string, detail?: string): void {
  const at = typeof performance !== "undefined" ? performance.now() : Date.now();
  entries.push({ at, event, detail });
  if (entries.length > MAX_ENTRIES) entries.shift();
  // Always printed: harmless in production, and the first thing worth asking
  // for when someone reports a launch that behaved oddly.
  console.info(`[intro] +${Math.round(at)}ms ${event}${detail ? ` — ${detail}` : ""}`);
}

export function introLog(): IntroLogEntry[] {
  return entries.slice();
}

export function resetIntroLog(): void {
  entries.length = 0;
}
