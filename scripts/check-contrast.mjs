/**
 * Contrast audit for the FlexStudy v2 tokens (DESIGN.md §3.1 / §8 / §11).
 *
 * DESIGN.md states the ratios in the token table are estimates and must be
 * verified with a tool before the tokens are locked. This is that tool.
 *
 * Run: node scripts/check-contrast.mjs
 * Exit code 1 if any pair fails its threshold.
 */

const LIGHT = {
  bg: "#F6F5F0",
  raised: "#FFFFFF",
  ink: "#14171A",
  mute: "#5E645F",
  line: "#DCDAD1",
  lineStrong: "#6B7280",
  hl: "#E4F55A",
  hlInk: "#14171A",
  hlRule: "#8A9000",
  ok: "#2E7D4F",
  warn: "#8A6100",
  danger: "#B3261E",
};

const DARK = {
  bg: "#111412",
  raised: "#1A1E1B",
  ink: "#ECEAE2",
  mute: "#9AA097",
  line: "#2B312D",
  lineStrong: "#7C8695",
  hl: "#E4F55A",
  hlInk: "#14171A",
  hlRule: "#E4F55A",
  ok: "#6FCF97",
  warn: "#E0B04A",
  danger: "#F2958F",
};

/** sRGB channel (0-255) -> linear (WCAG 2.x). */
function linearize(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {string} label  where this pair appears
 * @param {string} fg     foreground token value
 * @param {string} bg     background token value
 * @param {number} min    required ratio (4.5 text, 3.0 UI component)
 * @param {string} kind   "text" | "ui"
 */
const CHECKS = [
  // --- Light: body text ---
  ["light", "ink on bg (body text)", LIGHT.ink, LIGHT.bg, 4.5, "text"],
  ["light", "mute on bg (secondary text)", LIGHT.mute, LIGHT.bg, 4.5, "text"],
  ["light", "ink on raised (panel text)", LIGHT.ink, LIGHT.raised, 4.5, "text"],
  ["light", "mute on raised (panel meta)", LIGHT.mute, LIGHT.raised, 4.5, "text"],
  ["light", "bg on ink (primary button label)", LIGHT.bg, LIGHT.ink, 4.5, "text"],
  ["light", "hlInk on hl (stabilo text)", LIGHT.hlInk, LIGHT.hl, 4.5, "text"],

  // --- Light: status ---
  ["light", "ok on bg (status)", LIGHT.ok, LIGHT.bg, 4.5, "text"],
  ["light", "warn on bg (status)", LIGHT.warn, LIGHT.bg, 4.5, "text"],
  ["light", "danger on bg (status)", LIGHT.danger, LIGHT.bg, 4.5, "text"],
  ["light", "ok on raised (status in panel)", LIGHT.ok, LIGHT.raised, 4.5, "text"],
  ["light", "warn on raised (status in panel)", LIGHT.warn, LIGHT.raised, 4.5, "text"],
  ["light", "danger on raised (status in panel)", LIGHT.danger, LIGHT.raised, 4.5, "text"],

  // --- Light: non-text UI components (3:1) ---
  ["light", "ink on bg (active block border 1.5px)", LIGHT.ink, LIGHT.bg, 3.0, "ui"],
  ["light", "mute on bg (category symbol)", LIGHT.mute, LIGHT.bg, 3.0, "ui"],
  ["light", "lineStrong on bg (input/secondary border)", LIGHT.lineStrong, LIGHT.bg, 3.0, "ui"],
  ["light", "lineStrong on raised (input/secondary border)", LIGHT.lineStrong, LIGHT.raised, 3.0, "ui"],
  ["light", "hlRule on bg (now marker rule)", LIGHT.hlRule, LIGHT.bg, 3.0, "ui"],
  // Informational: `--line` is decorative (dividers, row rules). It is
  // deliberately NOT held to 3:1; it must never be the only edge of a control.
  ["light", "--line on bg (decorative divider)", LIGHT.line, LIGHT.bg, 0, "info"],

  // --- Dark: body text ---
  ["dark", "ink on bg (body text)", DARK.ink, DARK.bg, 4.5, "text"],
  ["dark", "mute on bg (secondary text)", DARK.mute, DARK.bg, 4.5, "text"],
  ["dark", "ink on raised (panel text)", DARK.ink, DARK.raised, 4.5, "text"],
  ["dark", "mute on raised (panel meta)", DARK.mute, DARK.raised, 4.5, "text"],
  ["dark", "bg on ink (primary button label)", DARK.bg, DARK.ink, 4.5, "text"],
  ["dark", "hlInk on hl (stabilo text)", DARK.hlInk, DARK.hl, 4.5, "text"],

  // --- Dark: status ---
  ["dark", "ok on bg (status)", DARK.ok, DARK.bg, 4.5, "text"],
  ["dark", "warn on bg (status)", DARK.warn, DARK.bg, 4.5, "text"],
  ["dark", "danger on bg (status)", DARK.danger, DARK.bg, 4.5, "text"],
  ["dark", "ok on raised (status in panel)", DARK.ok, DARK.raised, 4.5, "text"],
  ["dark", "warn on raised (status in panel)", DARK.warn, DARK.raised, 4.5, "text"],
  ["dark", "danger on raised (status in panel)", DARK.danger, DARK.raised, 4.5, "text"],

  // --- Dark: non-text UI components (3:1) ---
  ["dark", "ink on bg (active block border 1.5px)", DARK.ink, DARK.bg, 3.0, "ui"],
  ["dark", "mute on bg (category symbol)", DARK.mute, DARK.bg, 3.0, "ui"],
  ["dark", "lineStrong on bg (input/secondary border)", DARK.lineStrong, DARK.bg, 3.0, "ui"],
  ["dark", "lineStrong on raised (input/secondary border)", DARK.lineStrong, DARK.raised, 3.0, "ui"],
  ["dark", "hlRule on bg (now marker rule)", DARK.hlRule, DARK.bg, 3.0, "ui"],
  ["dark", "--line on bg (decorative divider)", DARK.line, DARK.bg, 0, "info"],
];

let failures = 0;

for (const theme of ["light", "dark"]) {
  console.log(`\n=== ${theme.toUpperCase()} ===`);
  const rows = CHECKS.filter((c) => c[0] === theme);
  for (const [, label, fg, bg, min, kind] of rows) {
    const ratio = contrast(fg, bg);
    const informational = kind === "info";
    const pass = informational || ratio >= min;
    if (!pass) failures += 1;
    const mark = informational ? "INFO" : pass ? "PASS" : "FAIL";
    const requirement = informational ? "no minimum" : `min ${min.toFixed(1)} ${kind}`;
    console.log(
      `${mark}  ${ratio.toFixed(2).padStart(6)}:1  (${requirement})  ${label}  [${fg} on ${bg}]`
    );
  }
}

/* ---------------------------------------------------------------------------
 * Candidate search.
 *
 * Two tokens in DESIGN.md have no usable value for the roles §5 assigns them:
 *
 *   1. `--line` is specified as the boundary of INPUTS and SECONDARY BUTTONS.
 *      Those are interactive controls, so §8's "komponen UI >= 3:1" applies.
 *      At ~1.3:1 the boundary is not perceivable as a control edge.
 *   2. In the light theme the "now" marker rule is `--hl` on `--bg`, which is
 *      1.10:1 — invisible. The swatch label stays legible because its text is
 *      `--hl-ink` ON `--hl`, but the 2px rule has no such pairing.
 *
 * Candidates below keep the palette's hues; none introduces a new colour.
 * ------------------------------------------------------------------------- */

function worstAgainst(hex, backgrounds) {
  return Math.min(...backgrounds.map((b) => contrast(hex, b)));
}

console.log("\n=== CANDIDATES: interactive control boundary (need >= 3.0:1) ===");
console.log("-- line-strong, light (must clear both --bg and --raised) --");
for (const c of ["#6B7280", "#767B84", "#82878F", "#8A8F98"]) {
  const w = worstAgainst(c, [LIGHT.bg, LIGHT.raised]);
  console.log(`  ${w >= 3 ? "OK " : "no "} ${c}  worst ${w.toFixed(2)}:1`);
}
console.log("-- line-strong, dark (must clear both --bg and --raised) --");
for (const c of ["#616A79", "#6E7887", "#7C8695", "#8A94A3"]) {
  const w = worstAgainst(c, [DARK.bg, DARK.raised]);
  console.log(`  ${w >= 3 ? "OK " : "no "} ${c}  worst ${w.toFixed(2)}:1`);
}

console.log("\n=== CANDIDATES: light-theme 'now' rule (need >= 3.0:1 on --bg) ===");
for (const c of ["#E4F55A", "#9AA300", "#8A9000", "#7E8500", "#14171A"]) {
  const r = contrast(c, LIGHT.bg);
  console.log(`  ${r >= 3 ? "OK " : "no "} ${c}  ${r.toFixed(2)}:1 on light --bg`);
}

console.log(
  `\n${failures === 0 ? "All pairs pass." : `${failures} pair(s) FAILED.`}`
);
process.exit(failures === 0 ? 0 : 1);
