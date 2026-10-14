"use client";

import type { ReactNode } from "react";
import type { BlockStatus, LinePattern } from "@/domain/types";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { CategoryGlyph, IconArrowRight, IconCheck, IconClock, IconPlay, IconSkip } from "./icons";

export function Panel({
  children,
  className,
  as: Component = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Component
      className={cn("surface-panel p-4 sm:p-5", className)}
      style={{ borderRadius: "var(--radius-panel)" }}
    >
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
        <Heading className={headingLevel === 2 ? "text-title" : "text-body font-semibold"}>
          {title}
        </Heading>
        {description ? <p className="text-meta text-ink-muted measure">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "accent",
}: {
  /** 0 … 1 */
  value: number;
  label: string;
  tone?: "accent" | "ok";
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
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className={cn("h-full rounded-full", tone === "ok" ? "bg-ok" : "bg-accent")}
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
  tone?: "neutral" | "accent" | "ok" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-surface text-ink-muted",
    accent: "border-accent bg-accent-surface text-ink",
    ok: "border-ok bg-ok-surface text-ok",
    warn: "border-warn bg-warn-surface text-warn",
    danger: "border-danger bg-danger-surface text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label font-medium",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Status is never colour alone: every badge pairs a colour with an icon and a
 * word, so it survives colour blindness and a black-and-white printout.
 */
export function StatusBadge({ status, className }: { status: BlockStatus; className?: string }) {
  const { t } = useI18n();
  const config: Record<BlockStatus, { tone: "neutral" | "accent" | "ok" | "warn"; icon: ReactNode }> = {
    planned: { tone: "neutral", icon: <IconClock width={14} height={14} /> },
    running: { tone: "accent", icon: <IconPlay width={14} height={14} /> },
    done: { tone: "ok", icon: <IconCheck width={14} height={14} /> },
    deferred: { tone: "warn", icon: <IconArrowRight width={14} height={14} /> },
    skipped: { tone: "neutral", icon: <IconSkip width={14} height={14} /> },
  };
  const { tone, icon } = config[status];
  return (
    <Chip tone={tone} icon={icon}>
      <span className={cn(status === "skipped" && "line-through", className)}>
        {t(`status.${status}`)}
      </span>
    </Chip>
  );
}

/** Categories are distinguished by icon, label and line pattern — never hue. */
export function PatternMark({ pattern, className }: { pattern: LinePattern; className?: string }) {
  const dash = pattern === "dashed" ? "5 4" : pattern === "dotted" ? "1.5 4" : undefined;
  return (
    <svg
      width="22"
      height="8"
      viewBox="0 0 22 8"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <line
        x1="1"
        y1="4"
        x2="21"
        y2="4"
        stroke="currentColor"
        strokeWidth={pattern === "solid" ? 3 : 2.5}
        strokeDasharray={dash}
        strokeLinecap={pattern === "dotted" ? "round" : "butt"}
      />
    </svg>
  );
}

export function CategoryTag({
  name,
  icon,
  pattern,
  className,
}: {
  name: string;
  icon: Parameters<typeof CategoryGlyph>[0]["icon"];
  pattern: LinePattern;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-meta text-ink-muted", className)}>
      <CategoryGlyph icon={icon} width={16} height={16} />
      <PatternMark pattern={pattern} className="text-ink-muted" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Native radios: keyboard support and screen readers come for free. */
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
  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 text-label font-medium text-ink-muted">{legend}</legend>
      <div className="inline-flex w-full flex-wrap gap-1 rounded-control border border-line-strong bg-surface p-1 sm:w-auto">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const active = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-3 text-meta transition-colors sm:flex-none",
                active
                  ? "bg-accent text-accent-ink font-medium"
                  : "text-ink-muted hover:bg-accent-surface hover:text-ink",
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
        {hint ? <span className="text-label text-ink-muted measure">{hint}</span> : null}
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
            "h-6 w-11 rounded-full border transition-colors",
            checked ? "border-accent bg-accent" : "border-line-strong bg-surface",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            "peer-disabled:opacity-55",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-1 top-1/2 size-4 -translate-y-1/2 rounded-full transition-transform",
            checked ? "translate-x-5 bg-accent-ink" : "bg-ink-muted",
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
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-line-strong bg-surface p-5">
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-meta text-ink-muted measure">{body}</p>
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
