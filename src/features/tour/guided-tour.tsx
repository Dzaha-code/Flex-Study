"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconCheck, IconClose } from "@/components/ui/icons";
import { useAppStore } from "@/data/store";
import { useStabiloHost } from "@/features/stabilo/stabilo-store";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { closeTour, nextStep, previousStep, useTour } from "./tour-store";

interface TourStep {
  /**
   * The screen this step lives on. The tour navigates there itself, so the
   * walkthrough is not limited to whatever page it was started from.
   */
  route: string;
  /** Matches a `data-tour` attribute on that screen. */
  target: string;
  /** Shown as a small chip so it is obvious when the tour changed screens. */
  screenKey: MessageKey;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

export const TOUR_STEPS: TourStep[] = [
  { route: "/", target: "nav", screenKey: "nav.today", titleKey: "tour.nav.title", bodyKey: "tour.nav.body" },
  { route: "/", target: "progress", screenKey: "nav.today", titleKey: "tour.progress.title", bodyKey: "tour.progress.body" },
  { route: "/", target: "focus", screenKey: "nav.today", titleKey: "tour.focus.title", bodyKey: "tour.focus.body" },
  { route: "/", target: "add", screenKey: "nav.today", titleKey: "tour.add.title", bodyKey: "tour.add.body" },
  { route: "/", target: "streak", screenKey: "nav.today", titleKey: "tour.streak.title", bodyKey: "tour.streak.body" },
  { route: "/week", target: "week-header", screenKey: "nav.week", titleKey: "tour.weekHeader.title", bodyKey: "tour.weekHeader.body" },
  { route: "/week", target: "week-grid", screenKey: "nav.week", titleKey: "tour.weekGrid.title", bodyKey: "tour.weekGrid.body" },
  { route: "/week", target: "week-targets", screenKey: "nav.week", titleKey: "tour.weekTargets.title", bodyKey: "tour.weekTargets.body" },
  // The recap is not a sixth nav tab, so the chip on this step reads "Rekap"
  // rather than a rail label — which is exactly how it announces the screen
  // change the tour makes on its own.
  { route: "/recap", target: "recap-summary", screenKey: "recap.title", titleKey: "tour.recap.title", bodyKey: "tour.recap.body" },
  { route: "/journal", target: "journal-entry", screenKey: "nav.journal", titleKey: "tour.journalEntry.title", bodyKey: "tour.journalEntry.body" },
  { route: "/journal", target: "journal-history", screenKey: "nav.journal", titleKey: "tour.journalHistory.title", bodyKey: "tour.journalHistory.body" },
  { route: "/settings", target: "settings-appearance", screenKey: "nav.settings", titleKey: "tour.settingsAppearance.title", bodyKey: "tour.settingsAppearance.body" },
  // 3.6d: name where templates live, in both of the places they actually are.
  { route: "/settings", target: "settings-templates", screenKey: "nav.settings", titleKey: "tour.templates.title", bodyKey: "tour.templates.body" },
  { route: "/settings", target: "settings-data", screenKey: "nav.settings", titleKey: "tour.settingsData.title", bodyKey: "tour.settingsData.body" },
  { route: "/guide", target: "guide-quick", screenKey: "nav.guide", titleKey: "tour.guideQuick.title", bodyKey: "tour.guideQuick.body" },
];

const CARD_WIDTH = 330;
const CARD_GAP = 16;
const VIEWPORT_MARGIN = 14;
const ESTIMATED_CARD_HEIGHT = 240;
/** How long to wait for a target to appear after navigating. */
const POLL_INTERVAL_MS = 80;
const POLL_ATTEMPTS = 25;
/** Time for the smooth scroll to settle before the spotlight is measured. */
const SCROLL_SETTLE_MS = 340;

type Side = "right" | "left" | "bottom" | "top";

interface Spotlight {
  /** Identifies the step the rect was measured for. */
  key: string;
  rect: DOMRect | null;
}

const NOTHING_MEASURED: Spotlight = { key: "", rect: null };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
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

function targetRect(target: string): DOMRect | null {
  const element = document.querySelector(`[data-tour="${target}"]`);
  return element ? element.getBoundingClientRect() : null;
}

/**
 * The viewport width, read through `useSyncExternalStore` so the card width is
 * derived rather than stored — a resize listener that calls setState from inside
 * an effect body would cascade renders.
 */
function subscribeViewport(listener: () => void): () => void {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}

const viewportWidth = () => window.innerWidth;
const serverViewportWidth = () => 1024;

/**
 * Picks the side with the most room, preferring one where the whole card fits.
 *
 * An earlier version only tried below-then-above, which broke on tall targets:
 * the nav rail is nearly a full screen high, so both options overflowed and the
 * card landed on top of the very thing it was describing.
 */
function pickSide(rect: DOMRect, cardWidth: number, cardHeight: number): Side {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const room: Array<[Side, number]> = [
    ["right", vw - rect.right - CARD_GAP - VIEWPORT_MARGIN - cardWidth],
    ["left", rect.left - CARD_GAP - VIEWPORT_MARGIN - cardWidth],
    ["bottom", vh - rect.bottom - CARD_GAP - VIEWPORT_MARGIN - cardHeight],
    ["top", rect.top - CARD_GAP - VIEWPORT_MARGIN - cardHeight],
  ];

  const fitting = room.filter(([, score]) => score >= 0);
  /**
   * When nothing fits — a full-width panel such as the Settings appearance
   * section — the card used to take the "least bad" side, which put it straight
   * over the middle of the thing it was describing. Docking it at the bottom of
   * the window instead keeps the top of the target readable and stops the card
   * from wandering into the middle of the page.
   */
  if (fitting.length === 0) return "bottom";

  return fitting.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

function cardStyle(rect: DOMRect | null, cardWidth: number, cardHeight: number): CSSProperties {
  // The shell only renders this after mount, but the module is still evaluated
  // for the server build, so the guard keeps a stray render from throwing.
  if (typeof window === "undefined") return { width: cardWidth };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: cardWidth,
    };
  }

  const side = pickSide(rect, cardWidth, cardHeight);
  let top: number;
  let left: number;

  switch (side) {
    case "right":
      left = rect.right + CARD_GAP;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      break;
    case "left":
      left = rect.left - CARD_GAP - cardWidth;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      break;
    case "bottom":
      left = rect.left + rect.width / 2 - cardWidth / 2;
      top = rect.bottom + CARD_GAP;
      break;
    default:
      left = rect.left + rect.width / 2 - cardWidth / 2;
      top = rect.top - CARD_GAP - cardHeight;
  }

  return {
    top: clamp(top, VIEWPORT_MARGIN, vh - cardHeight - VIEWPORT_MARGIN),
    left: clamp(left, VIEWPORT_MARGIN, vw - cardWidth - VIEWPORT_MARGIN),
    width: cardWidth,
  };
}

/**
 * An in-app walkthrough across the real screens, with the real data.
 *
 * It navigates on its own so every area is covered, and puts the card on
 * whichever side of the target has room — never over it.
 */
export function GuidedTour() {
  const { open, index } = useTour();
  /**
   * The character has priority. This is the second half of the coordination:
   * the coordinator closes this tour when she is asked for, and this guard stops
   * an in-flight tour from painting (or listening for keys) if she appears
   * anyway — for instance through the first-run path.
   */
  const suspended = useStabiloHost().flow !== null;
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const updateSettings = useAppStore((state) => state.updateSettings);

  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState<Spotlight>(NOTHING_MEASURED);
  const [cardHeight, setCardHeight] = useState(ESTIMATED_CARD_HEIGHT);
  /** Where the user was before the tour took over, so it can hand it back. */
  const returnTo = useRef<string | null>(null);

  const width = useSyncExternalStore(subscribeViewport, viewportWidth, serverViewportWidth);
  const cardWidth = Math.min(CARD_WIDTH, width - VIEWPORT_MARGIN * 2);

  const step = TOUR_STEPS[index];
  const total = TOUR_STEPS.length;
  const isLast = index === total - 1;
  /**
   * Fourteen dots, the active one wider, plus the "step x of y" text do not fit
   * across a 330px card at the default dot width. Thin the inactive dots rather
   * than let the row push the count out of the card.
   */
  const manySteps = total > 12;
  const stepKey = step ? `${step.route}|${step.target}` : "";

  // A rect measured for a different step says nothing about this one, so the
  // overlay simply stays hidden until the current target has been read.
  const measured = spotlight.key === stepKey;
  const rect = measured ? spotlight.rect : null;

  const finish = useCallback(() => {
    closeTour();
    // Marked either way: skipping is a decision, not an accident, and the tour
    // stays reachable from the guide page and settings afterwards.
    void updateSettings({ tourCompleted: true });
    const back = returnTo.current;
    returnTo.current = null;
    if (back && back !== pathname) router.push(back);
  }, [updateSettings, router, pathname]);

  // Remember the entry point once, when the tour opens.
  useEffect(() => {
    returnTo.current = open ? (returnTo.current ?? pathname) : null;
    // Only re-run when the tour opens or closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Follow the current step's screen.
  useEffect(() => {
    if (!open || suspended || !step) return;
    if (step.route !== pathname) router.push(step.route);
  }, [open, suspended, step, pathname, router]);

  // Find the target, measure it, and keep the spotlight in step with the page.
  // Every state write happens inside a callback, never in the effect body.
  useEffect(() => {
    if (!open || suspended || !step) return;

    let cancelled = false;
    let poll = 0;
    let settle = 0;
    let frame = 0;
    let attempts = 0;

    const read = () => {
      if (cancelled) return false;
      const next = targetRect(step.target);
      setSpotlight((previous) =>
        previous.key === stepKey && sameRect(previous.rect, next)
          ? previous
          : { key: stepKey, rect: next },
      );
      return next !== null;
    };

    // A target may only exist after the new route has painted, so poll briefly
    // instead of measuring once and falling back to a centred card.
    const look = () => {
      if (cancelled || read()) return;
      attempts += 1;
      if (attempts < POLL_ATTEMPTS) poll = window.setTimeout(look, POLL_INTERVAL_MS);
    };

    const settleAndScroll = () => {
      document
        .querySelector(`[data-tour="${step.target}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      settle = window.setTimeout(read, SCROLL_SETTLE_MS);
    };

    const remeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (read()) settleAndScroll();
      });
    };

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    // Scheduled rather than synchronous: setting state straight from the effect
    // body would cascade renders, and the target may not have painted yet.
    const first = window.setTimeout(() => {
      if (cancelled) return;
      if (read()) settleAndScroll();
      else look();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearTimeout(poll);
      window.clearTimeout(settle);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [open, suspended, step, stepKey]);

  // The card's height decides which side it fits on, so measure it rather than
  // guessing with a constant. Re-observes when the card mounts for a new step.
  useLayoutEffect(() => {
    const element = cardRef.current;
    if (!open || suspended || !element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setCardHeight((previous) => (Math.abs(previous - height) > 1 ? height : previous));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [open, suspended, stepKey, measured]);

  // Keyboard control, and focus the card so it is reachable without a mouse.
  useEffect(() => {
    if (!open || suspended) return;
    cardRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextStep(total);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousStep();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, suspended, finish, total]);

  if (!open || suspended || !step) return null;

  // While the next screen is still painting there is nothing honest to point
  // at, so the overlay stays out of the way rather than centring a card over an
  // unexplained page.
  if (!measured) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {rect ? (
        <>
          {/* Swallows clicks so the tour cannot be half-dismissed by accident. */}
          <div className="absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-panel ring-2 ring-hl transition-[top,left,width,height] duration-200"
            style={{
              top: rect.top - 5,
              left: rect.left - 5,
              width: rect.width + 10,
              height: rect.height + 10,
              boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.62)",
            }}
          />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(0,0,0,0.62)]" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        tabIndex={-1}
        style={cardStyle(rect, cardWidth, cardHeight)}
        className="surface-floating absolute flex flex-col gap-3 p-4 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="w-fit rounded-full border border-line-strong px-2 py-0.5 text-caption font-medium text-ink-muted">
              {t(step.screenKey)}
            </span>
            <h2 id="tour-step-title" className="text-title">
              {t(step.titleKey)}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label={t("tour.skip")}
            className="flex size-8 shrink-0 items-center justify-center rounded-ctl text-ink-muted hover:bg-accent-surface hover:text-ink"
          >
            <IconClose width={16} height={16} />
          </button>
        </div>

        <p className="text-body text-ink-muted">{t(step.bodyKey)}</p>

        <div className="flex items-center justify-between gap-2">
          <ol className="flex items-center gap-1" aria-hidden="true">
            {TOUR_STEPS.map((item, itemIndex) => (
              <li
                key={`${item.route}-${item.target}`}
                className={cn(
                  "h-1 rounded-full transition-colors",
                  itemIndex === index
                    ? "w-5 bg-ink"
                    : manySteps
                      ? "w-1.5 bg-line-strong"
                      : "w-2.5 bg-line-strong",
                )}
              />
            ))}
          </ol>
          <p className="shrink-0 text-caption text-mute" role="status">
            {t("tour.stepOf", { current: index + 1, total })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={previousStep} disabled={index === 0}>
            <IconArrowLeft />
            {t("tour.previous")}
          </Button>
          <Button size="sm" onClick={() => (isLast ? finish() : nextStep(total))}>
            {isLast ? <IconCheck /> : <IconArrowRight />}
            {isLast ? t("tour.finish") : t("tour.next")}
          </Button>
          {isLast ? null : (
            <button
              type="button"
              onClick={finish}
              className="text-caption text-ink-muted underline hover:text-ink"
            >
              {t("tour.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
