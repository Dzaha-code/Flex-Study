/**
 * Downloads the two bundled font families and their licences into
 * src/assets/fonts, so the desktop build needs no network and the binaries are
 * reproducible instead of magic.
 *
 * Both families are SIL OFL 1.1. The licence text lands next to the binaries.
 *
 * Usage:
 *   node scripts/fetch-fonts.mjs            # download the chosen variants
 *   node scripts/fetch-fonts.mjs --probe    # report byte sizes, download nothing
 *
 * `next/font/local` has no unicode-range support, so only the `latin` subset is
 * taken. That covers Indonesian and English, which are the two shipped locales.
 */
import fs from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const OUT_DIR = "src/assets/fonts";
const LICENSE_DIR = path.join(OUT_DIR, "LICENSES");

/**
 * Bricolage carries two variable axes rather than three. `opsz` is the one
 * DESIGN.md §2.3c actually relies on for the heading/display split; `wdth` is
 * never used, and shipping it costs ~80 KB against a 100 KB total budget.
 * Figtree is weight-only.
 */
const FAMILIES = [
  {
    file: "bricolage-grotesque-variable-latin.woff2",
    // Axes must be listed alphabetically, as Google Fonts requires.
    query: "Bricolage+Grotesque:opsz,wght@12..96,200..800",
    license: "bricolage-grotesque-OFL.txt",
    licenseUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt",
  },
  {
    file: "figtree-variable-latin.woff2",
    query: "Figtree:wght@300..900",
    license: "figtree-OFL.txt",
    licenseUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/figtree/OFL.txt",
  },
];

async function cssFor(query) {
  const url = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${query}: CSS request returned ${response.status}`);
  return response.text();
}

/** Google returns one @font-face per subset; `latin` is emitted last. */
function latinWoff2(css) {
  const matches = [...css.matchAll(/https:\/\/fonts\.gstatic\.com\/[^\s)]+\.woff2/g)];
  if (matches.length === 0) throw new Error("No .woff2 reference in the CSS response");
  return matches[matches.length - 1][0];
}

const probe = process.argv.includes("--probe");

if (!probe) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(LICENSE_DIR, { recursive: true });
}

let total = 0;

for (const family of FAMILIES) {
  const css = await cssFor(family.query);
  const url = latinWoff2(css);
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${family.file}: download returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  total += bytes.length;

  console.log(
    `${probe ? "PROBE " : ""}${family.file.padEnd(44)} ${(bytes.length / 1024).toFixed(1)} KB`,
  );

  if (probe) continue;

  fs.writeFileSync(path.join(OUT_DIR, family.file), bytes);

  const license = await fetch(family.licenseUrl);
  if (!license.ok) throw new Error(`${family.license}: licence returned ${license.status}`);
  fs.writeFileSync(path.join(LICENSE_DIR, family.license), await license.text());
}

console.log(`\ntotal ${(total / 1024).toFixed(1)} KB  (DESIGN.md §2.5 target: <= 100 KB)`);
