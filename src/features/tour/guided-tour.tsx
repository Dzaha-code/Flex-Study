"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconCheck, IconClose } from "@/components/ui/icons";
import { useAppStore } from "@/data/store";
import { useI18n, type MessageKey } from "@/i18n";
import { closeTour, nextStep, previousStep, useTour } from "./tour-store";

interface TourStep {
  /** Matches a `data-tour` attribute somewhere in the shell or on a screen. */
  target: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

/**
 * Ordered so each step introduces something the previous one referred to, and
 * every target is visible on the Today screen — the tour never has to navigate
 * on the user's behalf.
 */
export const TOUR_STEPS: TourStep[] = [
  { target: "nav", titleKey: "tour.nav.title", bodyKey: "tour.nav.body" },
  { target: "progress", titleKey: "tour.progress.title", bodyKey: "tour.progress.body" },
  { target: "focus", titleKey: "tour.focus.title", bodyKey: "tour.focus.body" },
  { target: "add", titleKey: "tour.add.title", bodyKey: "tour.add.body" },
  { target: "streak", titleKey: "tour.streak.title", bodyKey: "tour.streak.body" },
  { target: "guide", titleKey: "tour.guide.title", bodyKey: "tour.guide.body" },
];

const CARD_WIDTH = 340;
const CARD_GAP = 14;
const VIEWPORT_MARGIN = 12;
/** Only used to decide above/below; the card itself is naturally sized. */
const ASSUMED_CARD_HEIGHT = 220;

function rectFor(target: string): DOMRect | null {
  const element = document.querySelector(`[data-tour="${target}"]`);
  return element ? element.getBoundingClientRect() : null;
}

function cardStyle(rect: DOMRect | null): CSSProperties {
  if (typeof window === "undefined") return {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // No target on this screen: fall back to a centred card rather than a
  // spotlight pointing at nothing.
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: CARD_WIDTH };
  }

  const width = Math.min(CARD_WIDTH, vw - VIEWPORT_MARGIN * 2);
  const centred = rect.left + rect.width / 2 - width / 2;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(centred, vw - width - VIEWPORT_MARGIN));

  const below = rect.bottom + CARD_GAP;
  const top =
    below + ASSUMED_CARD_HEIGHT < vh - VIEWPORT_MARGIN
      ? below
      : Math.max(VIEWPORT_MARGIN, rect.top - ASSUMED_CARD_HEIGHT - CARD_GAP);

  return { top, left, width };
}

/**
 * An in-app walkthrough rather than a wall of text at first run: each step
 * points at the thing it describes, on the real screen, with the real data.
 */
export function GuidedTour() {
  const { open, index } = useTour();
  const { t } = useI18n();
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    closeTour();
    // Marked either way: skipping is a decision, not an accident, and the tour
    // stays reachable from the guide page and settings afterwards.
    void updateSettings({ tourCompleted: true });
  }, [updateSettings]);

  // Measure the target, and keep measuring while layout can still move: window
  // resizes and scrolling both shift a fixed-position spotlight.
  useEffect(() => {
    if (!open || !step) return;

    let frame = 0;
    const measure = () => {
      setRect(rectFor(step.target));
    };
    const remeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    const element = document.querySelector(`[data-tour="${step.target}"]`);
    element?.scrollIntoView({ block: "center", behavior: "smooth" });

    // Measure after the smooth scroll has had a chance to settle, then again on
    // every scroll frame so the spotlight tracks it.
    const settle = window.setTimeout(measure, 320);
    measure();

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    return () => {
      window.clearTimeout(settle);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [open, step]);

  // Keep the card reachable by keyboard and announce it as a dialog.
  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextStep(TOUR_STEPS.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousStep();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, finish]);

  if (!open || !step) return null;

  return (
    <div className="fixed inset-0 z-[70]" data-tour-root="">
      {/* The spotlight is a single element with a huge outer shadow, so the
          "hole" needs no masking and follows the target exactly. */}
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-panel ring-2 ring-hl transition-[top,left,width,height] duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(0,0,0,0.6)]" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        tabIndex={-1}
        style={cardStyle(rect)}
        className="surface-floating fixed flex flex-col gap-3 p-4 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="tour-step-title" className="text-title">
            {t(step.titleKey)}
          </h2>
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

        <p className="text-caption text-ink-muted" role="status">
          {t("tour.stepOf", { current: index + 1, total: TOUR_STEPS.length })}
        </p>

        <ol className="flex items-center gap-1" aria-hidden="true">
          {TOUR_STEPS.map((item, itemIndex) => (
            <li
              key={item.target}
              className={
                itemIndex === index
                  ? "h-1 w-5 rounded-full bg-ink"
                  : "h-1 w-5 rounded-full bg-line-strong"
              }
            />
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={previousStep}
            disabled={index === 0}
          >
            <IconArrowLeft />
            {t("tour.previous")}
          </Button>
          <Button
            size="sm"
            onClick={() => (isLast ? finish() : nextStep(TOUR_STEPS.length))}
          >
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
