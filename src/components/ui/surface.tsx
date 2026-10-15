"use client";

import type { ReactNode } from "react";
import type { BlockStatus, CategorySymbol } from "@/domain/types";
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
  return <Component className={cn("surface-panel p-4 sm:p-5", className)}>{children}</Component>;
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
      <legend className="mb-1 text-caption font-medium text-mute">{legend}</legend>
      <div className="inline-flex w-full flex-wrap gap-1 rounded-ctl border border-line-strong bg-raised p-1 sm:w-auto">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const active = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-3 text-ui transition-colors sm:flex-none",
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
            "h-6 w-11 rounded-full border transition-colors",
            checked ? "border-ink bg-ink" : "border-line-strong bg-raised",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
            "peer-disabled:opacity-45",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-1 top-1/2 size-4 -translate-y-1/2 rounded-full transition-transform",
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
