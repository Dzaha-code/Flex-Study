"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { rippleFromPointer } from "@/lib/ink";
import { cn } from "@/lib/utils";

/**
 * Radius, colour and motion all come from the design tokens. Hierarchy is
 * carried by radius and surface, never by a rainbow of accents.
 */
export const buttonVariants = cva(
  // `ink-ripple-host` (globals.css): the press ripple is clipped to the button
  // and anchored to it — no wrapper elements, no layout change.
  "ink-ripple-host inline-flex items-center justify-center gap-2 rounded-control border font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-accent text-accent-ink hover:bg-accent/85",
        secondary:
          "border-line-strong bg-surface-raised text-ink hover:bg-accent-surface hover:border-accent",
        ghost:
          "border-transparent bg-transparent text-ink-muted hover:bg-accent-surface hover:text-ink",
        danger: "border-transparent bg-danger-surface text-danger hover:bg-danger-surface/70",
      },
      size: {
        md: "h-11 px-4 text-meta",
        sm: "h-10 px-3 text-meta",
        lg: "h-12 px-5 text-body",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  onPointerDown,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      // Riak (DESIGN.md v3 §4): lime on the one primary, wash elsewhere.
      // Spread last, so a caller's own `data-ink-ripple="off"` wins — the
      // focus card's start button already has its own lime spread (§6).
      data-ink-ripple={(variant ?? "primary") === "primary" ? "primary" : undefined}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        rippleFromPointer(event);
      }}
      {...props}
    />
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control must still have an accessible name. */
  label: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}

export function IconButton({
  label,
  className,
  variant = "ghost",
  onPointerDown,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-ink-ripple={variant === "primary" ? "primary" : undefined}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        rippleFromPointer(event);
      }}
      className={cn(
        buttonVariants({ variant, size: "md" }),
        // 44 × 44 minimum touch target. Nothing else overrides this.
        "size-11 shrink-0 px-0",
        className,
      )}
      {...props}
    />
  );
}
