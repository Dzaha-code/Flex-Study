"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { BlockStatus, CategorySymbol } from "@/domain/types";
import { useI18n } from "@/i18n";
import { commitMerge, playMerge, type MergeRect } from "@/lib/ink";
import { cn } from "@/lib/utils";
import { CategoryGlyph, IconArrowRight, IconCheck, IconClock, IconPlay, IconSkip } from "./icons";

export function Panel({
  children,
  className,
  as: Component = "section",
  ...rest
}: {
  as?: "section" | "div" | "article" | "aside";
} & HTMLAttributes<HTMLElement>) {
  return (
    <Component className={cn("surface-panel p-4 sm:p-5", className)} {...rest}>
      {children}
    </Component>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  headingLevel = 2,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <Heading className={headingLevel === 2 ? "text-title-3" : "text-body font-medium"}>
          {title}
        </Heading>
        {description ? <p className="measure text-caption text-mute">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Progress reads as a ruled line, not a coloured bar (DESIGN.md §5): fill is
 * `--ink`, track is `--line`. 6px on the today screen, 4px for category rows.
 */
export function ProgressBar({
  value,
  label,
  height = 6,
  className,
}: {
  /** 0 … 1 */
  value: number;
  label: string;
  height?: 4 | 6;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuetext={label}
      className={cn("w-full overflow-hidden rounded-full bg-line", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full bg-ink transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line text-mute",
    ok: "border-ok/40 text-ok",
    warn: "border-warn/40 text-warn",
    danger: "border-danger/40 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-ctl border px-2.5 py-1 text-caption font-medium",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Status is never colour alone (DESIGN.md §8): every badge pairs a colour with
 * an icon and a word, so it survives colour blindness and a black-and-white
 * printout. No pill background — status is not a surface.
 */
export function StatusBadge({ status, className }: { status: BlockStatus; className?: string }) {
  const { t } = useI18n();
  const config: Record<BlockStatus, { tone: "mute" | "ok" | "warn"; icon: ReactNode }> = {
    planned: { tone: "mute", icon: <IconClock size={14} /> },
    running: { tone: "mute", icon: <IconPlay size={14} /> },
    done: { tone: "ok", icon: <IconCheck size={14} /> },
    deferred: { tone: "warn", icon: <IconArrowRight size={14} /> },
    skipped: { tone: "mute", icon: <IconSkip size={14} /> },
  };
  const { tone, icon } = config[status];
  const toneClass = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-mute";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption font-medium", toneClass)}>
      {icon}
      <span className={cn(status === "skipped" && "line-through", className)}>{t(`status.${status}`)}</span>
    </span>
  );
}

/** A category is its symbol plus its name. There is no colour to fall back on. */
export function CategoryTag({
  name,
  icon,
  className,
}: {
  name: string;
  icon: CategorySymbol;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-caption text-mute", className)}>
      <CategoryGlyph icon={icon} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Native radios: keyboard support and screen readers come for free.
 *
 * Lebur (DESIGN.md v3 §6.2): a box under the options stretches toward the new
 * selection — leading edge first, trailing edge 60 ms behind — then parks.
 * The active label keeps its own `bg-ink`, so its text is readable at every
 * frame; the travelling box is the liquid tail underneath, and at rest the two
 * are the same colour, so the control looks exactly as it did without motion.
 */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef<HTMLLabelElement>(null);
  const frameRef = useRef<MergeRect | null>(null);

  /**
   * Measure the active option and let Lebur carry the indicator over.
   * The indicator's style is written imperatively (commitMerge/playMerge own
   * left/right/width) — React rewriting `width` mid-flight would over-constrain
   * the box and silently kill the trailing-edge animation.
   */
  const syncIndicator = useCallback(() => {
    const box = listRef.current;
    const indicator = indicatorRef.current;
    const active = activeRef.current;
    if (!box || !indicator || !active) return;
    const next: MergeRect = {
      left: active.offsetLeft - box.clientLeft,
      width: active.offsetWidth,
    };
    const previous = frameRef.current;
    frameRef.current = next;
    if (!previous) commitMerge(indicator, next);
    else playMerge(indicator, previous, next, box.clientWidth);
  }, []);

  // After every commit: a value change re-render runs this before paint, so
  // the first measure never shows an unstyled indicator for a frame.
  useLayoutEffect(() => {
    syncIndicator();
  });

  // Local fonts still arrive after first paint; watching the active label
  // catches every re-measure (font swap, wrap, viewport) without polling.
  // No rectangle moved → no animation — same values short-circuit inside.
  useEffect(() => {
    const active = activeRef.current;
    if (!active || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => syncIndicator());
    observer.observe(active);
    // Re-observed every render so the target is always the current option.
    return () => observer.disconnect();
  });

  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 text-caption font-medium text-mute">{legend}</legend>
      <div
        ref={listRef}
        className="relative inline-flex w-full flex-wrap gap-1 rounded-ctl border border-line-strong bg-raised p-1 sm:w-auto"
      >
        <span
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-1 bottom-1 z-0 rounded-[6px] bg-ink"
        />
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const active = option.value === value;
          return (
            <label
              key={option.value}
              ref={active ? activeRef : undefined}
              htmlFor={id}
              className={cn(
                "relative z-10 flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-3 text-ui transition-colors sm:flex-none",
                active ? "bg-ink font-medium text-bg" : "text-mute hover:text-ink",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-body">{label}</span>
        {hint ? <span className="measure text-caption text-mute">{hint}</span> : null}
      </span>
      <label className="relative inline-flex h-11 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            // Isi (DESIGN.md v3 §6): the fill sweeps across the track while the
            // border settles — palette unchanged (ink fill, as before), only
            // the arrival is liquid now. Track stays --raised underneath so
            // the sweep has something to cross.
            "relative h-6 w-11 overflow-hidden rounded-full border bg-raised transition-colors",
            "[transition-duration:var(--t-fast)] [transition-timing-function:var(--ease-out)]",
            checked ? "border-ink" : "border-line-strong",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
            "peer-disabled:opacity-45",
          )}
        >
          <span
            className={cn(
              "absolute inset-0 origin-left bg-ink transition-transform",
              "[transition-duration:var(--t-fast)] [transition-timing-function:var(--ease-out)]",
              checked && "scale-x-100",
            )}
          />
        </span>
        <span
          aria-hidden="true"
          // Lebur: the knob rides the same 160 ms with a squash-and-rebound
          // landing (§2.3 --ease-squash) — stretch along the travel, settle.
          className={cn(
            "absolute left-1 top-1/2 size-4 -translate-y-1/2 rounded-full transition-transform",
            "[transition-duration:var(--t-fast)] [transform-timing-function:var(--ease-squash)]",
            checked ? "translate-x-5 bg-bg" : "bg-mute",
          )}
        />
      </label>
    </div>
  );
}

/** Empty states are an invitation to act, not a void. */
export function EmptyState({
  title,
  body,
  action,
  secondaryAction,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-line-strong bg-raised p-5">
      <div className="flex flex-col gap-1">
        <p className="text-body font-medium">{title}</p>
        <p className="measure text-caption text-mute">{body}</p>
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
