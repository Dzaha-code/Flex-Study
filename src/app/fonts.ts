import { Bricolage_Grotesque, Figtree } from "next/font/google";

/**
 * Two families, loaded once, self-hosted by next/font (DESIGN.md §2.5).
 *
 * The variable names are deliberately `--font-bricolage` / `--font-figtree`
 * rather than §9's `--font-display` / `--font-text`: `@theme` needs to compose
 * a fallback stack onto the same name, and reusing it would make the token
 * reference itself. `@theme` maps the stacks onto `--font-display` and
 * `--font-sans`, so the utilities in §9 are unchanged.
 *
 * `axes` activates Bricolage's optical-size and width axes, which §2.3c relies
 * on for the heading/display split. Figtree is weight-only.
 */
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});

export const text = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const fontVariables = `${display.variable} ${text.variable}`;
