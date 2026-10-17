"use client";

import { cn } from "@/lib/utils";

/**
 * Patience, shown honestly. It only appears during a quiz, because that is the
 * only place it can change — a meter that fills and empties on its own would
 * read as pressure rather than feedback (tourStabilo.md §6.1).
 */
export function Gauge({ value, label }: { value: 0 | 1 | 2 | 3; label: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className="sr-only">{label}</span>
      {[3, 2, 1].map((step) => (
        <span
          key={step}
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full border transition-colors",
            value >= step ? "border-accent bg-accent" : "border-line-strong bg-transparent",
          )}
        />
      ))}
    </div>
  );
}
