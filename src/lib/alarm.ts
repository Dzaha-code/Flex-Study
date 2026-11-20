/**
 * The "time is up" chime.
 *
 * Synthesised with Web Audio instead of shipped as a file: three soft notes
 * cost nothing in the installer, work offline, and need no licence line.
 *
 * Browsers (and WebView2) only let audio start after a user gesture. The tap on
 * "Mulai" is that gesture, so `primeAlarm()` is called there to create and
 * resume the context; when the alarm fires minutes later, the context is
 * already allowed to play. Every call is wrapped so a blocked or missing audio
 * stack can never break the timer.
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/** Call from a click handler so a later alarm is allowed to make sound. */
export function primeAlarm(): void {
  try {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  } catch {
    // Nothing to do: the alarm still shows and notifies without sound.
  }
}

/** C6, E6, G6: a rising major triad reads as "done", not as "error". */
const NOTES = [1046.5, 1318.5, 1568];
const NOTE_GAP = 0.16;
const ROUND_GAP = 1.1;

function tone(ctx: AudioContext, frequency: number, at: number, volume: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, at);
  // A fast attack and an exponential tail: a bell, not a beep.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.65);
}

/**
 * Plays the chime `rounds` times. Resolves at once; never rejects.
 * `volume` is 0 … 1 and defaults to a level that is clear without being harsh.
 */
export function playAlarm({ rounds = 3, volume = 0.22 }: { rounds?: number; volume?: number } = {}): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime + 0.05;
    for (let round = 0; round < rounds; round += 1) {
      NOTES.forEach((frequency, index) => {
        tone(ctx, frequency, start + round * ROUND_GAP + index * NOTE_GAP, volume);
      });
    }
  } catch {
    // Swallowed on purpose; see the module comment.
  }
}

/**
 * Keeps the page from being frozen while a block is running.
 *
 * Chromium (and so WebView2) may freeze a hidden page to save power, which
 * would hold the alarm until the window is shown again. A page holding a Web
 * Lock is exempt from freezing, so one is held for as long as a timer runs.
 * Tauri's own `backgroundThrottling` switch is unsupported on Windows; its docs
 * name this lock as the workaround. Returns the release function; a no-op where
 * the Locks API does not exist.
 */
export function holdAwakeLock(name = "flexstudy-focus"): () => void {
  if (typeof navigator === "undefined" || !("locks" in navigator)) return () => {};
  const handle: { release?: () => void; released: boolean } = { released: false };
  try {
    void navigator.locks
      .request(name, () =>
        new Promise<void>((resolve) => {
          handle.release = resolve;
          if (handle.released) resolve();
        }),
      )
      .catch(() => {});
  } catch {
    return () => {};
  }
  return () => {
    handle.released = true;
    handle.release?.();
  };
}

/**
 * Keeps the display on (Screen Wake Lock API). The browser drops the lock when
 * the page is hidden, so it is taken again whenever the page comes back.
 * Returns the release; a no-op where the API is missing.
 */
export function holdScreenAwake(): () => void {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return () => {};
  let sentinel: { release: () => Promise<void> } | null = null;
  let stopped = false;
  const acquire = async () => {
    if (stopped || document.visibilityState !== "visible") return;
    try {
      sentinel = await (
        navigator as Navigator & {
          wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
        }
      ).wakeLock.request("screen");
    } catch {
      // Low battery, no permission or no support: the screen sleeps as usual.
    }
  };
  void acquire();
  document.addEventListener("visibilitychange", acquire);
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", acquire);
    void sentinel?.release().catch(() => {});
  };
}

/** A short buzz on phones. Silently nothing on desktops and where it is blocked. */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // Not allowed here; haptics are a nicety.
  }
}
