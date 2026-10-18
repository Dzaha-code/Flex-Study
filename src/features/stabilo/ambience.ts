"use client";

/**
 * The room Stabilo speaks in.
 *
 * `audio.ts` holds one-shot files. This is the continuous layer underneath them:
 * a slow pad and a sparse music-box line, synthesised with Web Audio instead of
 * shipped as a loop. A loop long enough not to repeat audibly would cost
 * megabytes inside the installer, and a generated bed can duck itself when the
 * window is hidden without any mixing work.
 *
 * Everything is deliberately quiet. `MASTER` is the only place to change the
 * overall level; the individual voices stay near 0.05 so the mix cannot clip.
 * The exact timbre is a matter of taste, so every constant that shapes it lives
 * in this file and nowhere else.
 */

export type SoundLevel = "off" | "soft" | "normal";

/** Level multiplier for the whole bed, not for a single voice. */
const MASTER: Record<SoundLevel, number> = { off: 0, soft: 0.45, normal: 1 };

/** A minor pentatonic. Any two notes of it sound intentional together. */
const PENTATONIC = [220, 261.63, 293.66, 329.63, 392] as const;

/** One bar. Slow enough to sit under speech without competing with it. */
const BAR_MS = 2600;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let pad: GainNode | null = null;
let padVoices: AudioScheduledSourceNode[] = [];
let timer: number | null = null;
let step = 0;
let current: SoundLevel = "normal";
let unlocked = false;
let lastBlip = 0;
let blipCount = 0;

type AudioContextCtor = typeof AudioContext;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;

  const scope = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
  } catch {
    // A locked-down WebView can refuse to construct one at all.
    return null;
  }

  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function fadeTo(value: number): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(value, now + 1.1);
}

function startPad(audio: AudioContext): void {
  if (!master || padVoices.length > 0) return;

  const gain = audio.createGain();
  gain.gain.value = 0.055;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 620;
  filter.Q.value = 0.6;
  gain.connect(filter);
  filter.connect(master);

  const voices: Array<[number, number]> = [
    [110, -4],
    [164.81, 5],
    [220, 2],
  ];

  for (const [frequency, detune] of voices) {
    const osc = audio.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    osc.detune.value = detune;

    const voice = audio.createGain();
    voice.gain.value = 0.33;
    osc.connect(voice);
    voice.connect(gain);
    osc.start();
    padVoices.push(osc);
  }

  // A slow breath on the filter, so the pad never sits perfectly still.
  const lfo = audio.createOscillator();
  lfo.frequency.value = 0.06;
  const depth = audio.createGain();
  depth.gain.value = 180;
  lfo.connect(depth);
  depth.connect(filter.frequency);
  lfo.start();
  padVoices.push(lfo);

  pad = gain;
}

function pluck(audio: AudioContext, frequency: number, length: number, delay = 0): void {
  if (!master) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.value = frequency;

  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.055, start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);

  osc.connect(envelope);
  envelope.connect(master);
  osc.start(start);
  osc.stop(start + length + 0.05);
  osc.onended = () => envelope.disconnect();
}

function nextBar(): void {
  const audio = ctx;
  if (!audio || !master) return;
  if (typeof document !== "undefined" && document.hidden) return;

  step += 1;
  // Two notes, then a rest: a melody that never turns into a ringtone.
  if (step % 3 === 0) return;

  const note = PENTATONIC[(step * 2) % PENTATONIC.length] ?? PENTATONIC[0];
  pluck(audio, note, 0.9);
  if (step % 4 === 1) pluck(audio, note * 2, 0.55, 0.18);
}

/**
 * Starts or re-levels the bed. Safe to call repeatedly: the pad is only built
 * once, and a level change is a ramp rather than a restart.
 */
export function startAmbience(level: SoundLevel): void {
  current = level;
  if (typeof window === "undefined") return;

  if (level === "off") {
    stopAmbience();
    return;
  }

  const audio = context();
  if (!audio || !master) return;

  // WebView2 starts the graph suspended until a gesture. Resuming here is
  // best-effort; the listener below retries on the first real interaction.
  void audio.resume().catch(() => {});

  startPad(audio);
  fadeTo(MASTER[level]);

  if (timer === null) {
    timer = window.setInterval(nextBar, BAR_MS);
  }

  if (!unlocked) {
    unlocked = true;
    const unlock = () => {
      void ctx?.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
}

/** Fades out and tears the graph down. Called when the session closes. */
export function stopAmbience(): void {
  if (typeof window === "undefined") return;

  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  step = 0;

  fadeTo(0);

  const voices = padVoices;
  const oldPad = pad;
  padVoices = [];
  pad = null;

  if (voices.length === 0) return;

  /**
   * The old pad is silenced on its own gain rather than left to ride the master
   * fade: restarting the bed immediately after a stop (which is exactly what a
   * double-invoked effect does) would otherwise bring the previous pad back up
   * for a second.
   */
  if (oldPad && ctx) {
    const now = ctx.currentTime;
    oldPad.gain.cancelScheduledValues(now);
    oldPad.gain.setValueAtTime(oldPad.gain.value, now);
    oldPad.gain.linearRampToValueAtTime(0, now + 0.15);
  }

  // Long enough to cover that ramp, so nothing clicks off mid-note.
  window.setTimeout(() => {
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {
        /* Already stopped. */
      }
      voice.disconnect();
    }
    oldPad?.disconnect();
  }, 400);
}

/**
 * The tiny mouth noise under the typewriter. It is not a voice — it is the
 * sound of a line being written, which is what makes typed dialogue feel
 * spoken rather than printed.
 */
export function voiceBlip(): void {
  if (current === "off") return;
  const audio = ctx;
  if (!audio || !master) return;

  const now = performance.now();
  if (now - lastBlip < 48) return;
  lastBlip = now;

  blipCount += 1;
  const osc = audio.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 520 + (blipCount % 5) * 16;

  const envelope = audio.createGain();
  const at = audio.currentTime;
  envelope.gain.setValueAtTime(0.03, at);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);

  osc.connect(envelope);
  envelope.connect(master);
  osc.start(at);
  osc.stop(at + 0.05);
  osc.onended = () => envelope.disconnect();
}
