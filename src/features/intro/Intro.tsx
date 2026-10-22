"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import Link from "next/link";
import { COPY, type IntroLang } from "./copy";
import { readMirroredAnimation } from "@/lib/preferences";
import { resolveReducedMotion, systemPrefersReducedMotion } from "@/lib/motion";
import {
  introDebugEnabled,
  introLog,
  logIntro,
  resetIntroLog,
  subscribeIntroDebug,
} from "./intro-log";
import "./intro.css";

/* -------------------------------------------------------------------------
 * Arc geometry — computed once at module load, never from the current time,
 * so the ring is identical on every launch (INTRO-ANIMATION.md §8.4).
 * ---------------------------------------------------------------------- */

const R = 150;
const GAP = 3;

/** The five blocks of the template the user is about to choose, in minutes.
 *  Arc length is proportional to duration, so the ring is the plan itself. */
const MINS = [90, 90, 90, 45, 60];
/** How far each arc is thrown when the plan breaks. */
const DIST = [110, 150, 120, 170, 140];
/** How far each arc spins on the way out. */
const SPIN = [-18, 22, -26, 16, -12];

interface Arc {
  d: string;
  dx: number;
  dy: number;
  spin: number;
}

function buildArcs(): Arc[] {
  const total = MINS.reduce((sum, minutes) => sum + minutes, 0);
  const span = 360 - GAP * MINS.length;

  const point = (deg: number) => {
    const radians = (deg * Math.PI) / 180;
    return [R * Math.cos(radians), R * Math.sin(radians)] as const;
  };

  let cursor = -90 + GAP / 2;

  return MINS.map((minutes, index) => {
    const sweep = (minutes / total) * span;
    const [x0, y0] = point(cursor);
    const [x1, y1] = point(cursor + sweep);
    const middle = ((cursor + sweep / 2) * Math.PI) / 180;

    const arc: Arc = {
      // `pathLength={1}` on the element normalises the path, so one dash-array
      // unit is the whole arc and `stroke-dashoffset` alone drives the draw.
      d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      dx: Math.cos(middle) * DIST[index],
      dy: Math.sin(middle) * DIST[index],
      spin: SPIN[index],
    };

    cursor += sweep + GAP;
    return arc;
  });
}

const ARCS = buildArcs();

/** Never wait for a font forever; a timeout is better than a stuck screen. */
const FONT_TIMEOUT_MS = 800;

/** Nothing changes the answer after boot, so there is nothing to subscribe to. */
const subscribeNothing = () => () => {};

function fontsReady(): Promise<unknown> {
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS))]);
}

interface IntroProps {
  /** False while the gate is still deciding, so nothing renders before paint. */
  active: boolean;
  onDone: () => void;
  /** The app underneath, revealed by the closing circle. */
  appRef: RefObject<HTMLDivElement | null>;
  lang: IntroLang;
}

export function Intro({ active, onDone, appRef, lang }: IntroProps) {
  const root = useRef<HTMLDivElement>(null);
  /** Set inside the timeline closure; the skip button lives outside it. */
  const skipRef = useRef<((source: string) => void) | null>(null);
  const copy = COPY[lang];

  /**
   * The same three-way decision the stylesheets read from `<html>`, resolved
   * from the boot mirror. `useSyncExternalStore` is what keeps this honest
   * without state-in-an-effect: the server snapshot is `false` and the client
   * one is the real answer, so there is no hydration mismatch, no cascading
   * render, and the value is already settled before the gate says `active`.
   */
  const reduced = useSyncExternalStore(
    subscribeNothing,
    () =>
      resolveReducedMotion(readMirroredAnimation() ?? "system", systemPrefersReducedMotion()),
    () => false,
  );

  useEffect(() => {
    if (!active) return;

    let dead = false;
    let context: { revert: () => void } | undefined;
    let detach: (() => void) | undefined;

    logIntro("start", `reduce=${reduced}`);
    resetIntroLog();

    void (async () => {
      // GSAP is imported dynamically: a normal launch never downloads it.
      const [module] = await Promise.all([import("gsap"), fontsReady()]);
      const { gsap } = module;
      logIntro("chunk+fonts");

      const rootEl = root.current;
      const app = appRef.current;
      if (dead || !rootEl || !app) {
        // The detail matters: "cleaned up" is React StrictMode's double effect
        // or an unmount while GSAP loaded — normal. "No root or app element"
        // means the intro genuinely had nothing to animate.
        logIntro("abort", dead ? "cleaned up while GSAP loaded" : "no root or app element");
        return;
      }

      context = gsap.context(() => {
        const q = gsap.utils.selector(rootEl);
        const arcs = q(".arc");
        const ring = q(".ring")[0];
        const dot = q(".dot")[0] as HTMLElement;
        const lime = q(".lime")[0] as HTMLElement;

        // Set the initial state through GSAP so every property it will animate
        // is under GSAP's control from the first frame.
        gsap.set(arcs, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(q(".ch"), { yPercent: 130 });
        gsap.set(q(".ln > span"), { yPercent: 125 });
        gsap.set(q(".ft"), { opacity: 0, y: 8 });
        gsap.set(q(".hlbar"), { scaleX: 0, transformOrigin: "0% 50%" });
        gsap.set(dot, { scale: 0 });
        rootEl.classList.add("is-ready");

        // Measure only once the fonts are in, or the dot lands off the
        // baseline it is supposed to write along.
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const wordmark = q(".wm")[0].getBoundingClientRect();
        const slot = q(".dotslot")[0].getBoundingClientRect();
        // The dot is at `scale: 0`, so its own rect is 0×0. The slot is exactly
        // the dot's resting size (`--d`), so measure that instead.
        const dotSize = slot.width || 16;
        const writeFromX = wordmark.left - dotSize * 1.4 - cx;
        const baselineY = slot.top + slot.height / 2 - cy;
        const fullStopX = slot.left + slot.width / 2 - cx;

        // ---- Reduced motion: a static lockup, then a plain fade (§9) ----
        if (reduced) {
          logIntro("branch:static", "reduced motion — nothing moves by design");
          gsap.set(arcs, { opacity: 0 });
          gsap.set(q(".ch"), { yPercent: 0 });
          gsap.set(q(".ln > span"), { yPercent: 0 });
          gsap.set(q(".ft"), { opacity: 1, y: 0 });
          gsap.set(q(".hlbar"), { scaleX: 1 });
          gsap.set(q(".hlw"), { color: "#14171a" });
          gsap.set(dot, { scale: 1, x: fullStopX, y: baselineY });
          app.style.clipPath = "none";
          app.style.opacity = "0";
          gsap.to(app, { opacity: 1, duration: 0.35, delay: 1.2, onComplete: onDone });
          return;
        }

        logIntro("branch:full");

        // ---- The reveal: two circles. The stabilo leads, the app follows
        // 0.09 s later, so the lime reads as a thin ring at the edge (§5).
        const reveal = { lead: 0, follow: 0 };
        let originX = 0;
        let originY = 0;
        let maxRadius = 0;

        const measure = () => {
          const rect = dot.getBoundingClientRect();
          originX = rect.left + rect.width / 2;
          originY = rect.top + rect.height / 2;
          maxRadius = Math.hypot(
            Math.max(originX, window.innerWidth - originX),
            Math.max(originY, window.innerHeight - originY),
          );
        };

        let finished = false;
        let scrubbing = false;

        const timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            finished = true;
            app.style.clipPath = "";
            logIntro("done");
            onDone();
          },
        });

        timeline
          // 0.20 · the stabilo tip touches the paper
          .to(dot, { scale: 1, duration: 0.45, ease: "back.out(2.2)" }, 0.2)
          // 0.35 · the ring draws itself, arc by arc, clockwise
          .to(arcs, { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut", stagger: 0.08 }, 0.35)
          // 1.25 · the breath before the break
          .to(ring, { scale: 1.04, rotation: -3, duration: 0.2, ease: "power2.out" }, 1.25)
          .to(arcs, { strokeWidth: 5, duration: 0.2 }, 1.25)
          // 1.45 · the break
          .to(
            arcs,
            {
              x: (_index: number, el: SVGElement) => Number(el.dataset.dx),
              y: (_index: number, el: SVGElement) => Number(el.dataset.dy),
              rotation: (_index: number, el: SVGElement) => Number(el.dataset.spin),
              svgOrigin: "0 0",
              duration: 0.75,
              ease: "expo.out",
              stagger: 0.02,
            },
            1.45,
          )
          .to(dot, { scale: 1.7, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, 1.45)
          .to(arcs, { opacity: 0, duration: 0.35, ease: "power1.in", stagger: 0.03 }, 1.8)
          // 1.90 · the dot crosses to the wordmark's baseline and writes it
          .to(dot, { x: writeFromX, y: baselineY, duration: 0.3, ease: "power3.inOut" }, 1.9)
          .to(dot, { x: fullStopX, duration: 0.7, ease: "power2.inOut" }, 2.2)
          .to(q(".ch"), { yPercent: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 }, 2.0)
          // 2.75 · the two lines rise out of their masks
          .to(q(".ln > span"), { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.12 }, 2.75)
          // 3.20 · the stabilo sweeps the highlighted words. The text turns ink
          // as the sweep lands — not before — so the two never cross while the
          // letters are the same colour as the background.
          .to(q(".hlbar"), { scaleX: 1, duration: 0.6, ease: "expo.inOut" }, 3.2)
          .to(q(".hlw"), { color: "#14171a", duration: 0.2 }, 3.6)
          .to(q(".ft"), { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 3.5)
          // 4.20 · a beat to read it, then out
          .addLabel("exit", 4.2)
          .to(
            reveal,
            {
              lead: 1,
              duration: 0.95,
              ease: "expo.inOut",
              onStart: measure,
              onUpdate: () => {
                if (!maxRadius) measure();
                lime.style.clipPath = `circle(${reveal.lead * maxRadius}px at ${originX}px ${originY}px)`;
              },
            },
            "exit",
          )
          .to(
            reveal,
            {
              follow: 1,
              duration: 0.95,
              ease: "expo.inOut",
              onUpdate: () => {
                if (!maxRadius) measure();
                app.style.clipPath = `circle(${reveal.follow * maxRadius}px at ${originX}px ${originY}px)`;
              },
            },
            "exit+=0.09",
          );

        /**
         * Skipping is a decision, so it only answers deliberate controls: the
         * visible button, Esc, Space or Enter.
         *
         * A `pointerdown` anywhere on the backdrop used to skip as well, which
         * meant clicking the window to focus it (or a stray tap) cut the opening
         * off at whatever frame it had reached — indistinguishable from the
         * animation "stopping suddenly".
         */
        const skip = (source: string) => {
          if (finished || scrubbing) return;
          const exitAt = timeline.labels.exit ?? 0;
          if (timeline.time() >= exitAt - 0.2) return;
          logIntro("skip", source);
          scrubbing = true;
          timeline.tweenTo("exit", {
            duration: 0.45,
            ease: "power2.inOut",
            onComplete: () => timeline.play(),
          });
        };

        const onKey = (event: KeyboardEvent) => {
          if (event.key === "Escape" || event.key === " " || event.key === "Enter") {
            skip(`key:${event.key}`);
          }
        };

        skipRef.current = skip;
        window.addEventListener("keydown", onKey);
        detach = () => {
          skipRef.current = null;
          window.removeEventListener("keydown", onKey);
        };
      }, rootEl);
    })()
      .catch((error: unknown) => {
        /**
         * Never swallowed. A catch that only calls `onDone` turns every failure
         * into the same symptom — the intro stopping at an arbitrary frame —
         * with nothing left to tell the causes apart. The app is revealed fully
         * instead of being left half-masked.
         */
        const message = error instanceof Error ? error.message : String(error);
        logIntro("error", message);
        console.error("[flexstudy] intro failed", error);
        const app = appRef.current;
        if (app) {
          app.style.clipPath = "";
          app.style.opacity = "";
        }
        if (!dead) onDone();
      });

    return () => {
      dead = true;
      detach?.();
      context?.revert();
    };
  }, [active, appRef, onDone, reduced]);

  return (
    <div ref={root} className="intro" role="dialog" aria-modal="true" aria-label={copy.dialog}>
      <svg className="ring" viewBox="-200 -200 400 400" aria-hidden="true">
        {ARCS.map((arc, index) => (
          <path
            key={index}
            className={index === 0 ? "arc arc--lead" : "arc"}
            d={arc.d}
            pathLength={1}
            data-dx={arc.dx.toFixed(1)}
            data-dy={arc.dy.toFixed(1)}
            data-spin={String(arc.spin)}
          />
        ))}
      </svg>

      <div className="brand">
        <div className="wm" role="img" aria-label={copy.wordmark}>
          <span aria-hidden="true">
            {"Flex".split("").map((char, index) => (
              <span key={`flex-${index}`} className="cm">
                <span className="ch">{char}</span>
              </span>
            ))}
            {"Study".split("").map((char, index) => (
              <span key={`study-${index}`} className="cm">
                <span className="ch b">{char}</span>
              </span>
            ))}
            <span className="dotslot" />
          </span>
        </div>
        <p className="hd">
          <span className="ln">
            <span>{copy.l1}</span>
          </span>
          <span className="ln">
            <span>
              {copy.l2a}
              <em className="hlw">
                <i className="hlbar" />
                {copy.hl}
              </em>
              {copy.l2b}
            </span>
          </span>
        </p>
      </div>

      <i className="dot" aria-hidden="true" />
      <p className="ft">{copy.note}</p>
      {/* The still branch explains itself, so it cannot read as a broken build.
          The link goes *under* the overlay: the gate keeps the app mounted while
          the skip scrub finishes, so routing here lands on Atur → Tampilan the
          moment the reveal completes — no dead overlay, no extra tap. */}
      {reduced ? (
        <p className="intro-reduced">
          {copy.reduced}{" "}
          <Link
            href="/settings"
            className="intro-reduced-link"
            onClick={() => skipRef.current?.("reduced-link")}
          >
            {copy.reducedAction}
          </Link>
        </p>
      ) : null}
      <button type="button" className="skip" onClick={() => skipRef.current?.("button")}>
        {copy.skip}
      </button>
      <div className="lime" aria-hidden="true" />
      <IntroDebug />
    </div>
  );
}

/**
 * The diagnosis log, on screen, only when `fs.intro.debug` or `?introDebug=1` is
 * set. It polls because the timeline writes from inside a GSAP closure, and a
 * tick is cheaper than threading state through it — the release build has no
 * devtools, so this is the only way to read the log on the affected machine.
 */
function IntroDebug() {
  // The flag is read through a store hook, never as state set inside an effect:
  // the server snapshot is always `false`, so the prerendered HTML cannot know
  // about a query param or localStorage, and a client-side `true` would mismatch
  // hydration — the exact class of bug this log exists to catch.
  const enabled = useSyncExternalStore(subscribeIntroDebug, introDebugEnabled, () => false);
  const [entries, setEntries] = useState(introLog);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setEntries(introLog()), 400);
    return () => clearInterval(timer);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <pre className="intro-debug" aria-hidden="true">
      {entries
        .map(
          (entry) =>
            `+${Math.round(entry.at)} ${entry.event}${entry.detail ? ` — ${entry.detail}` : ""}`,
        )
        .join("\n")}
    </pre>
  );
}
