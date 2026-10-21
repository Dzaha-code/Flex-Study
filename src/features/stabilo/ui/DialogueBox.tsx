"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { EffectId } from "../engine/types";
import { controlsFor } from "./controls";
import { Gauge } from "./Gauge";

const GLITCH_GLYPHS = ["▒", "░", "?", "#"];
/** 160 ms between corruptions keeps it under two events per second. */
const GLITCH_INTERVAL_MS = 160;

function hash(value: number): number {
  // Deterministic so the same frame always paints the same glyphs; a real
  // random per render would fight React and flicker on every state change.
  const mixed = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b);
  return Math.abs(mixed) % 997;
}

/** Corrupts one or two characters at a time, then puts them back. */
function useGlitched(text: string, enabled: boolean): string {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), GLITCH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return useMemo(() => {
    if (!enabled || text.length === 0) return text;
    const seed = hash(tick);
    const first = seed % text.length;
    const second = (seed * 7 + 3) % text.length;
    const glyph = GLITCH_GLYPHS[seed % GLITCH_GLYPHS.length] ?? "▒";
    const chars = [...text];
    if (chars[first] !== undefined && chars[first] !== " ") chars[first] = glyph;
    if (tick % 3 === 0 && chars[second] !== undefined && chars[second] !== " ") {
      chars[second] = GLITCH_GLYPHS[(seed + 1) % GLITCH_GLYPHS.length] ?? "░";
    }
    return chars.join("");
  }, [text, enabled, tick]);
}

function TremblingLine({ text, amplitude }: { text: string; amplitude: number }) {
  return (
    <span style={{ ["--stabilo-shake" as string]: `${amplitude}px` }}>
      {[...text].map((char, index) => (
        <span
          key={`${index}-${char}`}
          className="stabilo-char"
          style={{ ["--stabilo-delay" as string]: `${(index % 4) * 12}ms` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

export interface DialogueBoxProps {
  speaker: string;
  text: string;
  typed: number;
  done: boolean;
  fx: EffectId[];
  /** Quiz lines get the slide-in banner treatment. */
  banner?: boolean;
  feedback?: string | null;
  ask?: boolean;
  quiz?: {
    prompt: string;
    options: Array<{ label: string; correct?: boolean }>;
    hinted: boolean;
  } | null;
  /** Asked out loud in the dialogue, not in a settings form. */
  nameInput?: {
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
  } | null;
  intensityPick?: {
    sweetLabel: string;
    spookyLabel: string;
    onPick: (value: "sweet" | "spooky") => void;
  } | null;
  gauge?: 0 | 1 | 2 | 3 | null;
  gaugeLabel: string;
  onContinue: () => void;
  onAnswer: (index: number) => void;
  onUnderstood: () => void;
  onUnsure: () => void;
  onSkipQuiz: () => void;
  onSkip: () => void;
  labels: {
    understood: string;
    unsure: string;
    skip: string;
    skipQuiz: string;
    next: string;
    /** The corner close button, and the confirmation it opens. */
    close: string;
    exitTitle: string;
    exitYes: string;
    exitNo: string;
    /** "Pick one" — the pen asking for an answer instead of leaving it silent. */
    pickOne: string;
    confused: string;
    confusedBody: string;
    /** The keyboard line, so the controls are never only discoverable by luck. */
    keys: string;
    nudge: string;
  };
}

/**
 * One dialogue box for every flow: the introduction, the tour and the quiz all
 * share it, so the character never changes shape between them.
 *
 * Clicking the box finishes the typing first and advances second, which is the
 * reading behaviour people already expect from visual novels.
 */
export function DialogueBox({
  speaker,
  text,
  typed,
  done,
  fx,
  banner = false,
  feedback = null,
  ask = false,
  quiz = null,
  nameInput = null,
  intensityPick = null,
  gauge = null,
  gaugeLabel,
  onContinue,
  onAnswer,
  onUnderstood,
  onUnsure,
  onSkipQuiz,
  onSkip,
  labels,
}: DialogueBoxProps) {
  const visible = text.slice(0, typed);
  const glitched = useGlitched(visible, done && fx.includes("glitch"));

  /** Two-step exit: closing the tour by accident is worse than one extra tap. */
  const [confirmExit, setConfirmExit] = useState(false);
  const [confused, setConfused] = useState(false);
  /**
   * Which line was on screen when the reader went quiet. Storing the text rather
   * than a boolean means a new line resets the nudge with no state write in an
   * effect, and a nudge can never land on a line it was not about.
   */
  const [idleFor, setIdleFor] = useState<string | null>(null);
  const amplitude = fx.includes("tremble3")
    ? 3
    : fx.includes("tremble2")
      ? 2
      : fx.includes("tremble1")
        ? 1
        : 0;

  const interactive = done && !feedback;

  /**
   * What this node must show, decided in one tested place. The unit test walks
   * every node of every script through this same function, so "no dead ends" is
   * a property of what renders here, not of a parallel model of it.
   */
  const controls = controlsFor({
    quiz: Boolean(quiz),
    ask,
    nameInput: Boolean(nameInput),
    intensityPick: Boolean(intensityPick),
  });

  /**
   * Ten seconds of silence on a node that is waiting for an answer gets one
   * quiet reminder. Not a new line, not a louder one — the patience ladder is
   * untouched, because being slow is not a mistake.
   */
  useEffect(() => {
    if (!interactive) return;
    const timer = window.setTimeout(() => setIdleFor(text), 10_000);
    return () => window.clearTimeout(timer);
  }, [interactive, text]);

  const awaitingAnswer = Boolean(quiz || ask || nameInput || intensityPick);
  const nudging = interactive && awaitingAnswer && idleFor === text;

  return (
    <div
      className={cn(
        "surface-floating pointer-events-auto flex w-full max-w-[680px] flex-col gap-3 p-4 sm:p-5",
        banner ? "stabilo-banner" : "stabilo-card-in",
      )}
      onClick={onContinue}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-[3px] bg-hl px-1.5 py-0.5 text-label font-semibold text-ink">
            {speaker}
          </span>
          {/* A speaking light: the same information as the caret, but readable
              at a glance without following the text. */}
          {done ? null : <span className="stabilo-speaking-dot" aria-hidden="true" />}
          {gauge !== null ? <Gauge value={gauge} label={gaugeLabel} /> : null}
        </div>
        {/* One place to leave, and it asks first: the reviewer's "no Oke/Close"
            was partly this — the way out existed but read as a stray word. */}
        {confirmExit ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-caption text-ink-muted">{labels.exitTitle}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSkip();
              }}
              className="rounded-ctl border border-line-strong px-2 py-1 text-caption text-ink"
            >
              {labels.exitYes}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setConfirmExit(false);
              }}
              className="rounded-ctl px-2 py-1 text-caption text-ink-muted hover:text-ink"
            >
              {labels.exitNo}
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={labels.close}
            onClick={(event) => {
              event.stopPropagation();
              setConfirmExit(true);
            }}
            className="flex items-center gap-1 rounded-ctl px-1.5 py-1 text-caption text-ink-muted hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
            {labels.close}
          </button>
        )}
      </div>

      {banner ? (
        <p className="text-title font-semibold">{text}</p>
      ) : (
        <p className="text-body leading-relaxed text-ink" aria-live="polite" aria-atomic="true">
          {amplitude > 0 ? (
            <TremblingLine text={glitched} amplitude={amplitude} />
          ) : (
            glitched
          )}
          {done ? null : (
            <span aria-hidden="true" className="stabilo-caret">
              ▌
            </span>
          )}
        </p>
      )}

      {feedback ? (
        <p className="stabilo-pop-in rounded-ctl border border-line bg-accent-surface px-3 py-2 text-meta text-ink">
          {feedback}
        </p>
      ) : null}

      {quiz && controls.options ? (
        <div className="flex flex-col gap-2">
          {quiz.prompt ? <p className="text-meta text-ink-muted">{quiz.prompt}</p> : null}
          {/* A question that does not say it wants an answer reads as broken. */}
          <p className="text-caption text-ink-muted">{confused ? labels.confusedBody : labels.pickOne}</p>
          <ul className="flex flex-col gap-1.5">
            {quiz.options.map((option, index) => (
              <li
                key={option.label}
                className="stabilo-option-in"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAnswer(index);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-ctl border px-3 py-2 text-left text-body transition-colors",
                    quiz.hinted && option.correct
                      ? "border-accent bg-accent-surface text-ink"
                      : "border-line-strong text-ink hover:bg-accent-surface",
                    !interactive && "opacity-60",
                  )}
                >
                  <span aria-hidden="true" className="text-caption text-mute">
                    {index + 1}
                  </span>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Always offered, not only after the engine decides to hint: a quiz whose
          only exit appears after two wrong answers has no exit. */}
      {quiz && controls.options ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setConfused((value) => !value);
            }}
            className="text-caption text-ink-muted underline hover:text-ink"
          >
            {labels.confused}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSkipQuiz();
            }}
            className="text-caption text-ink-muted underline hover:text-ink"
          >
            {labels.skipQuiz}
          </button>
        </div>
      ) : null}

      {controls.ask && !feedback ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!interactive}
            onClick={(event) => {
              event.stopPropagation();
              onUnderstood();
            }}
            className="h-10 rounded-control bg-accent px-4 text-meta font-medium text-accent-ink"
          >
            {labels.understood}
          </button>
          <button
            type="button"
            disabled={!interactive}
            onClick={(event) => {
              event.stopPropagation();
              onUnsure();
            }}
            className="h-10 rounded-control border border-line-strong px-4 text-meta text-ink"
          >
            {labels.unsure}
          </button>
        </div>
      ) : null}

      {nameInput && !feedback ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            nameInput.onSubmit();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            value={nameInput.value}
            onChange={(event) => nameInput.onChange(event.target.value)}
            placeholder={nameInput.placeholder}
            maxLength={40}
            disabled={!done}
            aria-label={speaker}
            className="h-10 min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 text-body text-ink outline-none focus-visible:border-accent"
          />
          <button
            type="submit"
            disabled={!done}
            className="h-10 rounded-control bg-accent px-4 text-meta font-medium text-accent-ink disabled:opacity-50"
          >
            {labels.next}
          </button>
        </form>
      ) : null}

      {intensityPick && !feedback ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!interactive}
            onClick={(event) => {
              event.stopPropagation();
              intensityPick.onPick("sweet");
            }}
            className="h-10 rounded-control border border-line-strong px-4 text-meta text-ink hover:bg-accent-surface disabled:opacity-60"
          >
            {intensityPick.sweetLabel}
          </button>
          <button
            type="button"
            disabled={!interactive}
            onClick={(event) => {
              event.stopPropagation();
              intensityPick.onPick("spooky");
            }}
            className="h-10 rounded-control bg-accent px-4 text-meta font-medium text-accent-ink disabled:opacity-60"
          >
            {intensityPick.spookyLabel}
          </button>
        </div>
      ) : null}

      {controls.next ? (
        <button
          type="button"
          disabled={!interactive}
          onClick={(event) => {
            event.stopPropagation();
            onContinue();
          }}
          className="self-end h-9 rounded-control border border-line-strong px-3 text-caption text-ink-muted hover:text-ink disabled:opacity-40"
        >
          {labels.next}
          <span aria-hidden="true" className="ml-1 text-[10px]">
            ▼
          </span>
        </button>
      ) : null}

      {nudging ? <p className="text-caption text-ink-muted">{labels.nudge}</p> : null}

      {/* Spelled out rather than hidden behind the card: the click target and
          the keys do the same thing, and saying so costs one line. */}
      {done ? <p className="text-caption text-ink-muted/80">{labels.keys}</p> : null}
    </div>
  );
}
