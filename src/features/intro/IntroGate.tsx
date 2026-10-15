"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { readMirroredIntro } from "@/lib/preferences";
import { Intro } from "./Intro";
import { DEFAULT_INTRO_MODE, INTRO_FORCE_KEY, INTRO_SEEN_KEY, resolveIntroPhase } from "./intro-mode";

/**
 * What the intro shows on this launch (INTRO-ANIMATION.md §9).
 *
 * Three pieces of `localStorage` rather than IndexedDB, and that is deliberate:
 * the decision has to be made *before* the database answers, or the intro would
 * either flash over a loaded app or be skipped on the launch that needs it.
 * IndexedDB is still the source of truth for the preference — `settings.intro`
 * is mirrored into the same boot mirror the theme uses, written whenever
 * settings are saved.
 *
 * The keys live in `intro-mode.ts`; what matters here is when they are written.
 * The seen flag is written when the intro finishes or is skipped, never when it
 * starts, so closing the app mid-intro still shows it next time.
 */
type Phase = "pending" | "run" | "done";

/** The flag never changes while the app is open, so there is nothing to watch. */
function subscribe(): () => void {
  return () => {};
}

function readPhase(): Phase {
  try {
    const mode = readMirroredIntro() ?? DEFAULT_INTRO_MODE;
    return resolveIntroPhase(
      mode,
      localStorage.getItem(INTRO_SEEN_KEY) === "1",
      localStorage.getItem(INTRO_FORCE_KEY) === "1",
    );
  } catch {
    // Storage blocked: skip the intro rather than showing it on every launch.
    return "done";
  }
}

function serverPhase(): Phase {
  return "pending";
}

/**
 * Holds the app behind the intro on first launch, then hands it over.
 *
 * `useSyncExternalStore` keeps the server and first client render identical
 * (`pending`) and only reads storage after hydration, so there is no hydration
 * mismatch and no `setState` in an effect. `serverPhase` is what makes the
 * pre-effect paint a plain ink field instead of the template list.
 */
export function IntroGate({ children }: { children: ReactNode }) {
  const appRef = useRef<HTMLDivElement>(null);
  const [forced, setForced] = useState(false);
  const locale = useI18n().locale;

  const stored = useSyncExternalStore(subscribe, readPhase, serverPhase);
  const phase: Phase = forced ? "done" : stored;
  const holding = phase !== "done";

  const finish = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
      // Spent here rather than when it was requested: an app closed halfway
      // through a requested replay still shows it on the next launch.
      localStorage.removeItem(INTRO_FORCE_KEY);
    } catch {
      /* Storage blocked: the intro plays again next launch. Harmless. */
    }
    const app = appRef.current;
    if (app) {
      app.style.clipPath = "";
      app.style.opacity = "";
    }
    setForced(true);
  }, []);

  return (
    <>
      {holding ? (
        <Intro active={phase === "run"} onDone={finish} appRef={appRef} lang={locale} />
      ) : null}
      {/*
        The same element stays mounted throughout, so the app underneath is
        never remounted and its state survives the handover. While held it is
        `inert` and hidden from assistive tech, so focus cannot leak behind it.
      */}
      <div
        ref={appRef}
        className={holding ? "app-hold" : "app-root"}
        aria-hidden={holding || undefined}
        inert={holding}
      >
        {children}
      </div>
    </>
  );
}
