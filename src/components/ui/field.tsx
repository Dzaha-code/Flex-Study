"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { IconWarning } from "./icons";

const CONTROL_CLASS =
  "w-full rounded-control border border-line-strong bg-surface-raised px-3 text-body text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:opacity-55";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  children: (ids: { controlId: string; describedBy: string | undefined }) => ReactNode;
}

/**
 * Wires label, hint and error into one accessible unit. Every control in the
 * app goes through this so `aria-describedby` can never drift.
 */
export function FieldShell({ label, hint, error, optionalLabel, children }: FieldShellProps) {
  const controlId = useId();
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-label font-medium text-ink-muted">
        {label}
        {optionalLabel ? <span className="font-normal"> · {optionalLabel}</span> : null}
      </label>
      {children({ controlId, describedBy: describedBy || undefined })}
      {hint ? (
        <p id={hintId} className="text-label text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-label text-danger">
          <IconWarning width={14} height={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface CommonFieldProps {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  className?: string;
}

export function TextInput({
  label,
  hint,
  error,
  optionalLabel,
  className,
  ...props
}: CommonFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      {({ controlId, describedBy }) => (
        <input
          id={controlId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL_CLASS, "h-11", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function TimeInput({
  label,
  hint,
  error,
  optionalLabel,
  className,
  ...props
}: CommonFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      {({ controlId, describedBy }) => (
        <input
          id={controlId}
          type="time"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL_CLASS, "h-11 max-w-[10rem]", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function NumberInput({
  label,
  hint,
  error,
  optionalLabel,
  suffix,
  className,
  ...props
}: CommonFieldProps & InputHTMLAttributes<HTMLInputElement> & { suffix?: string }) {
  return (
    <FieldShell label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      {({ controlId, describedBy }) => (
        <div className="flex items-center gap-2">
          <input
            id={controlId}
            type="number"
            inputMode="numeric"
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cn(CONTROL_CLASS, "h-11 max-w-[9rem]", className)}
            {...props}
          />
          {suffix ? <span className="text-meta text-ink-muted">{suffix}</span> : null}
        </div>
      )}
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  hint,
  error,
  optionalLabel,
  options,
  className,
  ...props
}: CommonFieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <FieldShell label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      {({ controlId, describedBy }) => (
        <select
          id={controlId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL_CLASS, "h-11", className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optionalLabel,
  className,
  ...props
}: CommonFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      {({ controlId, describedBy }) => (
        <textarea
          id={controlId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL_CLASS, "min-h-28 resize-y py-3 leading-relaxed", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}
