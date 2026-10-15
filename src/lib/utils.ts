import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `text-*` is overloaded in Tailwind: the same prefix carries both font size
 * (`text-meta`) and colour (`text-ink`). Out of the box `tailwind-merge` only
 * knows the stock scale, so it cannot tell our custom names apart — it treats
 * `text-ink` as a font size, puts it in the same group as `text-meta`, and
 * keeps only the last one.
 *
 * The failure is silent and looks like a rendering bug: the colour class is
 * dropped, the element inherits `--ink`, and a primary button whose fill is
 * also `--ink` renders its label invisibly.
 *
 * Declaring both scales explicitly is what makes the merge safe. Every new
 * `--text-*` or `--color-*` token must be added here, and `tests/cn.test.ts`
 * fails if the two groups ever collide again.
 */
const FONT_SIZES = [
  "timer",
  "title-1",
  "title-2",
  "title-3",
  "body-lg",
  "body",
  "ui",
  "caption",
  "numeral",
  // Migration bridge names (see globals.css).
  "label",
  "meta",
  "title",
  "display",
  "hero",
];

const TEXT_COLOURS = [
  "bg",
  "raised",
  "ink",
  "mute",
  "line",
  "line-strong",
  "hl",
  "hl-ink",
  "hl-rule",
  "ok",
  "warn",
  "danger",
  // Migration bridge names (see globals.css).
  "surface",
  "surface-raised",
  "ink-muted",
  "accent",
  "accent-ink",
  "accent-surface",
  "ok-surface",
  "warn-surface",
  "danger-surface",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      "text-color": [{ text: TEXT_COLOURS }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
