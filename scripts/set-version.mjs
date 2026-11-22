/**
 * Sets the app version everywhere it lives, so a release never ships with the
 * three files disagreeing (the updater compares against tauri.conf.json, the
 * Android versionCode is derived from it, and Cargo.toml names the binary).
 *
 *   npm run version:set 0.5.8
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const next = process.argv[2];
if (!next || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(next)) {
  console.error("\n  Usage: npm run version:set 1.2.3\n");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");

function edit(file, transform) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.error(`  ! no version found in ${file}`);
    process.exit(1);
  }
  writeFileSync(path, after);
  console.log(`  ${file}`);
}

// Only the top-level "version" key: the first match in each file.
edit("package.json", (text) => text.replace(/"version":\s*"[^"]*"/, `"version": "${next}"`));
edit("src-tauri/tauri.conf.json", (text) => text.replace(/"version":\s*"[^"]*"/, `"version": "${next}"`));
edit("src-tauri/Cargo.toml", (text) => text.replace(/^version = "[^"]*"/m, `version = "${next}"`));

console.log(`\n  Version set to ${next}. Run npm install once so package-lock.json follows.\n`);
