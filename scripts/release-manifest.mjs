/**
 * Puts one platform's build into `installers/` together with the manifest the
 * installed apps read to find updates. `npm run release:publish` then uploads
 * everything for this version to the GitHub release in one go.
 *
 *   npm run release:manifest -- windows
 *   npm run release:manifest -- android [--apk path/to/signed.apk]
 *
 * Each machine runs only its own platform: the laptop that builds Windows runs
 * `windows`, the one that builds Android runs `android`, and both publish to
 * the same tag (`release:publish` uploads over an existing release).
 *
 * - `latest.json`   Tauri's updater format, for the Windows app. The installers
 *                   must be signed with the updater key (TAURI_SIGNING_PRIVATE_KEY
 *                   at build time); the app checks that signature before it
 *                   runs anything.
 * - `android.json`  For the APK: version, download URL and SHA-256. Android
 *                   also refuses an APK signed with a different keystore.
 *
 * The in-app "what's new" text is the `### Yang baru` part of this version's
 * section in RELEASE-NOTES.md — the same section the GitHub release shows.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const REPO = "Dzaha-code/Flex-Study";
const root = resolve(import.meta.dirname, "..");
const config = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));
const version = config.version;
const tag = `v${version}`;
const product = config.productName;
const outDir = join(root, "installers");
const download = (file) => `https://github.com/${REPO}/releases/download/${tag}/${file}`;

const [platform, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : undefined;
};

function fail(message) {
  console.error(`\n[release-manifest] ${message}\n`);
  process.exit(1);
}

function releaseNotes() {
  const path = join(root, "RELEASE-NOTES.md");
  if (!existsSync(path)) return `${product} ${version}`;
  const lines = readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${version} `));
  if (start === -1) return `${product} ${version}`;
  const after = lines.slice(start + 1);
  const end = after.findIndex((line) => line.startsWith("## "));
  const section = end === -1 ? after : after.slice(0, end);
  const whatsNew = section.findIndex((line) => line.startsWith("### Yang baru"));
  if (whatsNew === -1) return section.join("\n").trim();
  const tail = section.slice(whatsNew + 1);
  const next = tail.findIndex((line) => line.startsWith("### "));
  return (next === -1 ? tail : tail.slice(0, next)).join("\n").trim();
}

const notes = releaseNotes();
const pubDate = new Date().toISOString();
mkdirSync(outDir, { recursive: true });

if (platform === "windows") {
  const candidates = [
    {
      key: "windows-x86_64",
      dir: join(root, "src-tauri", "target", "release", "bundle", "nsis"),
      file: `${product}_${version}_x64-setup.exe`,
    },
    {
      key: "windows-aarch64",
      dir: join(root, "src-tauri", "target", "aarch64-pc-windows-msvc", "release", "bundle", "nsis"),
      file: `${product}_${version}_arm64-setup.exe`,
    },
  ];

  const platforms = {};
  for (const { key, dir, file } of candidates) {
    const installer = join(dir, file);
    if (!existsSync(installer)) continue;
    const signature = `${installer}.sig`;
    if (!existsSync(signature)) {
      fail(
        `${file} has no .sig next to it. Build with the updater key set\n` +
          `  (TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD), then build again.`,
      );
    }
    copyFileSync(installer, join(outDir, file));
    copyFileSync(signature, join(outDir, `${file}.sig`));
    platforms[key] = { signature: readFileSync(signature, "utf8").trim(), url: download(file) };
    console.log(`  + installers/${file} (+ .sig)`);
  }

  if (Object.keys(platforms).length === 0) {
    fail(`No ${version} installer found. Run \`npm run tauri build\` (and/or npm run build:windows-arm64) first.`);
  }

  writeFileSync(
    join(outDir, "latest.json"),
    `${JSON.stringify({ version, notes, pub_date: pubDate, platforms }, null, 2)}\n`,
  );
  console.log("  + installers/latest.json");
} else if (platform === "android") {
  const apk =
    flag("apk") ??
    join(root, "src-tauri", "gen", "android", "app", "build", "outputs", "apk", "arm64", "release", "app-arm64-release.apk");
  if (!existsSync(apk)) {
    fail(`No signed APK at ${apk}.\n  Build it with keystore.properties in place, or pass --apk <path>.`);
  }
  if (basename(apk).includes("unsigned")) {
    fail(`${basename(apk)} is unsigned and cannot be installed. Sign it first.`);
  }

  const file = `${product}_${version}_arm64.apk`;
  copyFileSync(apk, join(outDir, file));
  const sha256 = createHash("sha256").update(readFileSync(apk)).digest("hex");
  writeFileSync(
    join(outDir, "android.json"),
    `${JSON.stringify({ version, notes, pub_date: pubDate, url: download(file), sha256 }, null, 2)}\n`,
  );
  console.log(`  + installers/${file}\n  + installers/android.json`);
} else {
  fail("Usage: npm run release:manifest -- <windows|android> [--apk path]");
}

console.log("\n  Next: npm run release:publish   (uploads everything for this version)\n");
