/**
 * Diagnostic: does the prerendered static shell contain page content, or only
 * the BootScreen skeleton?
 *
 * Confirms (or refutes) the claim that AppBoundary's mount gate keeps every
 * route's segment out of the shell — which is what the Next.js "dropped
 * segment" instant-navigation insight is reporting.
 *
 * Run: node scripts/inspect-shell.mjs
 */
import fs from "node:fs";
import path from "node:path";

const base = ".next/server/app";

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

/** Strings that only exist inside a rendered screen, not in the skeleton. */
const PROBES = ["animate-pulse", "Hari ini", "Bahasa", "Jangan lupa", "Mulai"];

const files = walk(base);
if (files.length === 0) {
  console.log(`No prerendered HTML found under ${base}. Run \`npm run build\` first.`);
  process.exit(1);
}

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const found = PROBES.filter((probe) => html.includes(probe));
  const skeleton = found.includes("animate-pulse");
  const content = found.filter((probe) => probe !== "animate-pulse");
  console.log(
    `${file.split(path.sep).slice(-3).join("/").padEnd(34)} ${String(html.length).padStart(6)} bytes  ` +
      `skeleton:${skeleton ? "YES" : "no "}  screenContent:${content.length ? content.join(",") : "none"}`,
  );
}
