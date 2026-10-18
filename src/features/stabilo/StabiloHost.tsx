"use client";

import "./stabilo.css";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/data/store";
import { todayISO } from "@/domain";
import { useIntroHolding } from "@/features/intro/intro-status";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { startAmbience, stopAmbience, voiceBlip } from "./ambience";
import { prefetchPhaseSprites, probeCoreSprites, type SpriteKey } from "./assets";
import { playClip } from "./audio";
import {
  GAUGE_FOR_PHASE,
  PHASE_SPRITE,
  advance,
  judge,
  nodeAt,
  startDialogue,
  visualPhaseFor,
  type DialogueState,
} from "./engine/dialogue";
import type { EffectId } from "./engine/types";
import { interpolate, nameParam } from "./engine/text";
import { TYPE_MS, TYPE_MS_SLOW, speak, speakInstant, type Mouth } from "./engine/typewriter";
import { STABILO_PLACEHOLDER } from "./flags";
import { showClassicTour, showStabilo } from "@/features/guide/guide-coordinator";
import { closeTour } from "@/features/tour/tour-store";
import { REACTIONS, scriptFor, wrongLine, type Flow, type TourContext } from "./script";
import { closeStabilo, useStabiloHost } from "./stabilo-store";
import { DialogueBox } from "./ui/DialogueBox";
import { Sprite } from "./ui/Sprite";

/** Time for the smooth scroll to settle before the spotlight is measured. */
const SCROLL_SETTLE_MS = 320;
const POLL_INTERVAL_MS = 80;
const POLL_ATTEMPTS = 25;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function normalisePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function sameRect(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

/**
 * Scrolls a target into the part of the window the bottom stage does not cover.
 *
 * `scrollIntoView({ block: "center" })` centres the element in the *viewport*,
 * which on a short window leaves its lower half under the dialogue box — the card
 * covering the thing it is describing. The centre is therefore computed against
 * the free band above the stage instead.
 */
function scrollIntoBand(element: HTMLElement, dockHeight: number): void {
  const margin = 18;
  const bandTop = margin;
  const bandBottom = window.innerHeight - dockHeight - margin;
  const rect = element.getBoundingClientRect();
  const available = Math.max(120, bandBottom - bandTop);

  // A target taller than the band can only be aligned at its top: centring it
  // would put its heading off-screen.
  const targetTop =
    rect.height >= available ? bandTop : bandTop + (available - rect.height) / 2;
  const delta = rect.top - targetTop;
  if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: "smooth" });
}

/**
 * Mounts the character once, above every screen, and decides when she speaks.
 *
 * Two entry points: an automatic one that follows the first-run order, and a
 * manual one used by "Putar tur" in Settings and the guide. The automatic path
 * stops as soon as the introduction has been seen and the tour has been finished
 * or skipped, so she never reappears uninvited.
 */
export function StabiloHost() {
  const { flow, nonce } = useStabiloHost();
  const status = useAppStore((state) => state.status);
  const prefs = useAppStore((state) => state.stabilo);
  const onboardingCompleted = useAppStore((state) => state.settings.onboardingCompleted);
  const holding = useIntroHolding();

  const [available, setAvailable] = useState<boolean | null>(STABILO_PLACEHOLDER ? true : null);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (STABILO_PLACEHOLDER) return;
    let alive = true;
    void probeCoreSprites().then((ok) => {
      if (alive) setAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Nothing to draw means the character cannot appear, so a requested tour
   * falls back to the classic one instead of doing nothing at all.
   */
  useEffect(() => {
    if (available !== false || !flow) return;
    showClassicTour();
  }, [available, flow]);

  /**
   * One walkthrough at a time. The coordinator already closes the classic tour
   * when she is asked for, but the first-run path can open her while a tour is
   * still on screen — and two overlays is exactly the bug this fixes.
   */
  useEffect(() => {
    if (flow) closeTour();
  }, [flow]);

  // First-run order: language → intro animation → Stabilo → template → tour.
  useEffect(() => {
    if (autoOpened.current) return;
    if (!prefs.enabled || holding) return;
    if (status !== "ready" || available !== true) return;

    /**
     * Only a genuinely new install gets the introduction unprompted. Anyone who
     * already finished onboarding keeps the app they know, and finds her in
     * Settings or the guide — being greeted by a new character one morning is
     * exactly the kind of surprise this project avoids.
     */
    if (!onboardingCompleted && !prefs.introSeen) {
      autoOpened.current = true;
      showStabilo("intro");
      return;
    }
    /**
     * The tour only needs onboarding to be finished, not the introduction to
     * have been seen. Requiring `introSeen` meant that a profile upgraded from
     * 0.4.x — onboarding done, no character yet — fell through both branches and
     * never saw a tour unless it was started by hand.
     */
    if (onboardingCompleted && !prefs.tourDone) {
      autoOpened.current = true;
      showStabilo("tour");
    }
  }, [prefs.enabled, prefs.introSeen, prefs.tourDone, onboardingCompleted, status, available, holding]);

  if (available !== true) return null;

  return flow ? <StabiloSession key={`${flow}-${nonce}`} flow={flow} /> : null;
}

function StabiloSession({ flow }: { flow: Flow }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const prefs = useAppStore((state) => state.stabilo);
  const updateStabilo = useAppStore((state) => state.updateStabilo);
  const updateSettings = useAppStore((state) => state.updateSettings);

  /**
   * Read once, when the session opens. The tour is a script, not a live view —
   * deciding this halfway through would rewrite a line the user is reading.
   */
  const [tourContext] = useState<TourContext>(() => ({
    hasBlocks: useAppStore
      .getState()
      .instances.some((instance) => instance.date === todayISO(Date.now())),
  }));

  const script = useMemo(() => scriptFor(flow, locale, tourContext), [flow, locale, tourContext]);
  const reactions = REACTIONS[locale];

  const [state, setState] = useState<DialogueState>(() => {
    const base = startDialogue(script);
    if (flow === "tour" && prefs.progress && script.nodes[prefs.progress.nodeId]) {
      return { ...base, nodeId: prefs.progress.nodeId, phase: prefs.progress.phase };
    }
    return base;
  });

  const [mouth, setMouth] = useState<Mouth>("closed");
  const [feedback, setFeedback] = useState<string | null>(null);
  /** Typed into the dialogue itself, then saved when the line is submitted. */
  const [draftName, setDraftName] = useState(prefs.nickname);
  /**
   * Both of these are keyed by what they describe instead of being reset inside
   * an effect. A stale key simply reads as "not started yet", which is the same
   * result with no cascading render.
   */
  const [spotlight, setSpotlight] = useState<{ key: string; rect: DOMRect | null }>({
    key: "",
    rect: null,
  });
  const [progress, setProgress] = useState<{ key: string; typed: number; done: boolean }>({
    key: "",
    typed: 0,
    done: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  /** True when the current feedback should advance instead of retrying. */
  const advanceAfterFeedback = useRef(false);
  /** The bottom stage, measured so targets are never scrolled under it. */
  const dockRef = useRef<HTMLDivElement>(null);

  const node = nodeAt(script, state);

  const params = useMemo(
    () => ({
      name: nameParam(prefs.nickname),
      start: t("common.start"),
      finish: t("tour.finish"),
      skip: t("common.skip"),
      shift: t("today.messy"),
      today: t("nav.today"),
      week: t("nav.week"),
      journal: t("nav.journal"),
      settings: t("nav.settings"),
      guide: t("nav.guide"),
    }),
    [prefs.nickname, t],
  );

  const text = useMemo(() => {
    if (!node) return "";
    const base = node.mode?.[prefs.intensity] ?? node.text;
    return interpolate(base, params);
  }, [node, prefs.intensity, params]);

  const lineKey = `${state.nodeId}|${text}`;
  const typed = progress.key === lineKey ? progress.typed : 0;
  const done = progress.key === lineKey ? progress.done : false;
  const spotKey = `${node?.target ?? ""}|${pathname}`;
  const rect = node?.target && spotlight.key === spotKey ? spotlight.rect : null;

  const finish = useCallback(() => {
    void updateStabilo(
      flow === "intro" ? { introSeen: true } : { tourDone: true, progress: null },
    );
    /**
     * The classic tour carries its own completion flag. Without this, a user who
     * finished *this* tour and later turned the character off would be shown the
     * fourteen-step one as if they had never seen a tour at all.
     */
    if (flow === "tour") void updateSettings({ tourCompleted: true });
    closeStabilo();
  }, [flow, updateStabilo, updateSettings]);

  const go = useCallback(
    (branch: "next" | "unsure" = "next") => {
      playClip("advance", useAppStore.getState().stabilo.sound);
      const next = advance(script, state, branch);
      if (!next) {
        finish();
        return;
      }
      setFeedback(null);
      advanceAfterFeedback.current = false;
      setState(next);
    },
    [script, state, finish],
  );

  // Follow the node's screen.
  useEffect(() => {
    if (!node?.route) return;
    if (normalisePath(pathname) !== node.route) router.push(node.route);
  }, [node?.route, pathname, router]);

  // Measure the target the node points at, and keep the ring on it while the
  // page moves underneath — including the scroll this hook causes itself.
  useEffect(() => {
    if (!node?.target) return;

    let cancelled = false;
    let attempts = 0;
    let poll = 0;
    let settle = 0;
    let frame = 0;

    const selector = `[data-tour="${node.target}"]`;

    const read = () => {
      if (cancelled) return;
      const element = document.querySelector(selector);
      const next = element ? element.getBoundingClientRect() : null;
      setSpotlight((previous) =>
        previous.key === spotKey && sameRect(previous.rect, next)
          ? previous
          : { key: spotKey, rect: next },
      );
    };

    const look = () => {
      if (cancelled) return;
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        attempts += 1;
        if (attempts < POLL_ATTEMPTS) poll = window.setTimeout(look, POLL_INTERVAL_MS);
        else read();
        return;
      }
      scrollIntoBand(element, dockRef.current?.offsetHeight ?? 240);
      settle = window.setTimeout(read, SCROLL_SETTLE_MS);
    };

    const track = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(read);
    };

    window.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);

    poll = window.setTimeout(look, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(poll);
      window.clearTimeout(settle);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
    };
  }, [node?.target, spotKey]);

  // Typing. Aborting is how "finish the line" works, so the promise always ends.
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const options = {
      signal: controller.signal,
      onChar: (index: number) => {
        // Every third character: dense enough to sound like speech, sparse
        // enough not to turn into a machine gun. `voiceBlip` also rate-limits.
        if (index % 3 === 1) voiceBlip();
        setProgress({ key: lineKey, typed: index, done: false });
      },
      onFrame: setMouth,
    };

    const run = prefersReducedMotion()
      ? speakInstant(text, options)
      : speak(text, { ...options, ms: node?.slow ? TYPE_MS_SLOW : TYPE_MS });

    void run.then(() => {
      if (controller.signal.aborted) return;
      setProgress((current) => (current.key === lineKey ? { ...current, done: true } : current));
    });

    return () => controller.abort();
  }, [lineKey, text, node?.slow]);

  const finishLine = useCallback(() => {
    abortRef.current?.abort();
    setProgress({ key: lineKey, typed: text.length, done: true });
    setMouth("closed");
  }, [lineKey, text.length]);

  const continueFromBox = useCallback(() => {
    if (!done) {
      finishLine();
      return;
    }
    if (feedback) {
      if (advanceAfterFeedback.current) {
        advanceAfterFeedback.current = false;
        go();
      } else {
        setFeedback(null);
      }
      return;
    }
    // These nodes wait for their own control; a stray click must not skip them.
    if (node?.quiz || node?.ask || node?.input || node?.pick) return;
    go();
  }, [done, feedback, finishLine, go, node?.ask, node?.input, node?.pick, node?.quiz]);

  function answer(index: number) {
    if (!node?.quiz) return;
    const correct = node.quiz.options[index]?.correct === true;
    const result = judge(state, node.quiz, correct, prefs.intensity);

    const level = useAppStore.getState().stabilo.sound;

    if (correct) {
      playClip("correct", level);
      setFeedback(reactions.correct);
      advanceAfterFeedback.current = true;
      setState(result.state);
      return;
    }

    if (result.outcome === "reset") {
      playClip("wrong", level);
      setFeedback(reactions.reset);
      advanceAfterFeedback.current = false;
      setState(result.state);
      return;
    }

    // From ph2 the sound turns into the glitch rather than a plain buzz: the
    // ladder should be audible, not only visible.
    playClip(result.state.phase >= 2 ? "glitch" : "wrong", level);
    setFeedback(
      result.outcome === "sweet" ? reactions.sweet : wrongLine(reactions, result.state.phase),
    );
    advanceAfterFeedback.current = false;
    setState(result.state);
  }

  // Keyboard: Enter/Space advances, Escape leaves without any scolding.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.key === "Enter" || event.key === " ") {
        if (node?.quiz && done && !feedback) return;
        event.preventDefault();
        continueFromBox();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [continueFromBox, done, feedback, finish, node?.quiz]);

  // Remember where the tour stopped, so a closed window does not restart it.
  useEffect(() => {
    if (flow !== "tour") return;
    void updateStabilo({ progress: { nodeId: state.nodeId, phase: state.phase } });
  }, [flow, state.nodeId, state.phase, updateStabilo]);

  useEffect(() => {
    if (flow === "tour") prefetchPhaseSprites();
  }, [flow]);

  /**
   * The bed runs only while she is on screen. It is started from an effect so a
   * blocked autoplay simply stays silent — the dialogue never waits for audio.
   */
  useEffect(() => {
    startAmbience(prefs.sound);
    return () => stopAmbience();
  }, [prefs.sound]);

  // She arrives once per session, not on every line.
  useEffect(() => {
    if (state.nodeId !== script.start) return;
    playClip("appear", useAppStore.getState().stabilo.sound);
  }, [script.start, state.nodeId]);

  /**
   * The overlay is *not* unmounted while a target is being measured any more.
   * On a screen the node navigates to, that gap used to tear the scrim away and
   * show the bare page for a few frames — the flash that made the whole guide
   * feel broken. The card can be read before the ring appears; the ring is the
   * only thing that has to wait for a measurement.
   */
  if (!node) return null;

  const visualPhase = visualPhaseFor(state, prefs.intensity);
  const sprite: SpriteKey = PHASE_SPRITE[visualPhase] as SpriteKey;
  /** A one-shot flinch on every wrong answer, in both temperaments. */
  const recoil = feedback !== null && state.wrongRun > 0;
  /**
   * The ladder is supposed to be visible, not just readable in the gauge. From
   * ph2 she keeps trembling; ph3 trembles harder and faster.
   */
  const trembleClass =
    prefs.fx && state.phase >= 2
      ? state.phase === 3
        ? "stabilo-tremble-hard"
        : "stabilo-tremble-soft"
      : null;

  const phaseFx: EffectId[] =
    state.phase > 0 ? [`tremble${state.phase}` as EffectId, "vignette"] : [];
  const fx: EffectId[] = [...(prefs.fx ? (node.fx ?? []) : []), ...(prefs.fx ? phaseFx : [])];

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label={t("stabilo.speaker")}
    >
      {rect ? (
        <>
          <div className="absolute inset-0" onClick={() => continueFromBox()} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-panel ring-2 ring-hl transition-[top,left,width,height] duration-200"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.62)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.62)]" onClick={() => continueFromBox()} />
      )}

      <div className="stabilo-vignette" data-on={state.phase > 0} aria-hidden="true" />

      {/* One fixed stage at the bottom of the window. It used to jump between
          the top and the bottom depending on where the target was, which is why
          she appeared to teleport between lines and why the card sometimes sat
          in the middle of the page with no relation to anything. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3 sm:px-4 sm:pb-4">
        <div
          ref={dockRef}
          className="flex w-full max-w-[860px] items-end justify-center gap-2 sm:gap-4"
        >
          <div className="pointer-events-auto w-full min-w-0 max-w-[620px]">
            <DialogueBox
            speaker={t("stabilo.speaker")}
            text={text}
            typed={typed}
            done={done}
            fx={fx}
            banner={Boolean(node.quiz)}
            feedback={feedback}
            ask={node.ask === "understood"}
            quiz={
              node.quiz
                ? {
                    prompt: interpolate(node.quiz.prompt, params),
                    options: node.quiz.options.map((option) => ({
                      label: interpolate(option.label, params),
                      correct: option.correct,
                    })),
                    hinted: state.hinted,
                  }
                : null
            }
            gauge={node.quiz ? GAUGE_FOR_PHASE[state.phase] : null}
            gaugeLabel={t("stabilo.gauge")}
            onContinue={continueFromBox}
            onAnswer={answer}
            onUnderstood={() => go("next")}
            onUnsure={() => go("unsure")}
            onSkipQuiz={() => go("next")}
            nameInput={
              node.input === "nickname"
                ? {
                    value: draftName,
                    placeholder: t("stabilo.namePlaceholder"),
                    onChange: setDraftName,
                    onSubmit: () => {
                      void updateStabilo({ nickname: draftName.trim() });
                      go();
                    },
                  }
                : null
            }
            intensityPick={
              node.pick === "intensity"
                ? {
                    sweetLabel: t("settings.stabilo.intensity.sweet"),
                    spookyLabel: t("settings.stabilo.intensity.spooky"),
                    onPick: (intensity) => {
                      void updateStabilo({ intensity });
                      go();
                    },
                  }
                : null
            }
            onSkip={finish}
            labels={{
              understood: t("stabilo.understood"),
              unsure: t("stabilo.unsure"),
              skip: t("stabilo.skip"),
              skipQuiz: t("stabilo.skipQuiz"),
              next: t("stabilo.next"),
            }}
            />
          </div>

          {/* Her slot is fixed: bottom-right of the stage, bottom-aligned with
              the card, the same place on every single line.
              The slot is square on purpose — every sprite is exported on one
              1670×1670 canvas, so a tall, narrow slot would let the image spill
              sideways over the dialogue card. */}
          <div className="pointer-events-none hidden w-[170px] shrink-0 sm:block lg:w-[215px]">
            {/* Keyed by the wrong-answer count so the flinch replays on every
                miss; a plain class would only animate the first time. */}
            <div
              key={`${sprite}-${state.nodeId}-${state.wrongRun}`}
              className={cn("h-[170px] w-full lg:h-[215px]", recoil && "stabilo-recoil")}
            >
              <div className={cn("h-full w-full", trembleClass ?? "stabilo-idle")}>
                <Sprite
                  sprite={sprite}
                  mouth={mouth}
                  placeholder={STABILO_PLACEHOLDER}
                  onMissing={() => finish()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
