import localFont from "next/font/local";

/**
 * Two families, loaded from files committed to the repo (ToApk.md §A4).
 *
 * `next/font/google` already self-hosts, so the web build never contacted
 * Google at runtime — but it did need the network *at build time*. Bundling
 * the `.woff2` files removes that dependency, which is what makes an offline
 * desktop build possible. Run `node scripts/fetch-fonts.mjs` to refresh them.
 *
 * The variable names are deliberately `--font-bricolage` / `--font-figtree`
 * rather than `--font-display` / `--font-text`: `@theme` composes a fallback
 * stack onto the same name, and reusing it would make the token reference
 * itself (the circularity in DESIGN.md §9). `@theme` maps the stacks onto
 * `--font-display` and `--font-sans`, so the utilities are unchanged.
 *
 * Bricolage keeps its optical-size axis, which §2.3c relies on, but not the
 * unused width axis — see scripts/fetch-fonts.mjs for the measured saving.
 */
const display = localFont({
  src: "../assets/fonts/bricolage-grotesque-variable-latin.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

const text = localFont({
  src: "../assets/fonts/figtree-variable-latin.woff2",
  variable: "--font-figtree",
  display: "swap",
  weight: "300 900",
});

export const fontVariables = `${display.variable} ${text.variable}`;
