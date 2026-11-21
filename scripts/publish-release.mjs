/**
 * Publishes the Windows installers as a GitHub Release.
 *
 * The binaries used to live in `installers/` and were committed, which added
 * ~72 MB to the repository and again on every release. They are published as
 * release assets now: the repository stays small while the download link keeps
 * working for anyone on the Releases page.
 *
 * Usage:
 *   npm run release:publish            # create/refresh the release for the current version
 *   npm run release:publish -- --draft # upload as a draft, publish by hand later
 *
 * Requires the GitHub CLI, signed in (`gh auth login`). Nothing here touches
 * git history, tags or the remote: it only uploads the four files it finds in
 * `installers/` for the version in `package.json`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const draft = process.argv.includes("--draft");

function fail(message) {
  console.error(`\n[publish-release] ${message}\n`);
  process.exit(1);
}

function readVersion(file) {
  const json = JSON.parse(readFileSync(join(root, file), "utf8"));
  return json.version;
}

const pkgVersion = readVersion("package.json");
const tauriVersion = readVersion("src-tauri/tauri.conf.json");

// Windows Installer identifies a product by its version, so shipping two
// different versions under one tag would make "Repair" appear instead of an
// upgrade. Catch that here instead of at install time.
if (pkgVersion !== tauriVersion) {
  fail(`Versi tidak sama: package.json=${pkgVersion}, tauri.conf.json=${tauriVersion}`);
}

const tag = `v${pkgVersion}`;
const installerDir = join(root, "installers");

if (!existsSync(installerDir)) {
  fail(`Folder installers/ tidak ada. Build dulu: npm run tauri build`);
}

const wanted = readdirSync(installerDir)
  .filter((name) => name.includes(`_${pkgVersion}_`))
  .map((name) => join(installerDir, name))
  .sort();

if (wanted.length === 0) {
  fail(`Tidak ada installer untuk versi ${pkgVersion} di installers/`);
}

const tooSmall = wanted.filter((file) => statSync(file).size < 1024 * 1024);
if (tooSmall.length > 0) {
  fail(`Berkas ini terlalu kecil untuk sebuah installer:\n  ${tooSmall.join("\n  ")}`);
}

const auth = spawnSync("gh", ["auth", "status"], { shell: true, encoding: "utf8" });
if (auth.status !== 0) {
  fail("GitHub CLI belum masuk. Jalankan `gh auth login` lebih dulu, lalu ulangi.");
}

/**
 * Release notes come from RELEASE-NOTES.md so there is one copy of them. The
 * section for this version ends at the next `## ` heading.
 */
function releaseNotes() {
  const path = join(root, "RELEASE-NOTES.md");
  if (!existsSync(path)) return `FlexStudy ${pkgVersion}`;
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${pkgVersion} `));
  if (start === -1) return `FlexStudy ${pkgVersion}`;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
  return body || `FlexStudy ${pkgVersion}`;
}

const title = `FlexStudy ${pkgVersion}`;
const args = [
  "release",
  "create",
  tag,
  ...wanted,
  "--title",
  title,
  "--notes",
  releaseNotes(),
  draft ? "--draft" : "--latest",
];

console.log(`[publish-release] ${tag}: ${wanted.length} berkas`);
for (const file of wanted) console.log(`  - ${file.replace(`${root}\\`, "")}`);

const created = spawnSync("gh", args, { shell: true, stdio: "inherit" });
if (created.status === 0) process.exit(0);

// Already exists: upload over the top instead of failing the whole command.
console.log(`[publish-release] ${tag} sudah ada, mengunggah ulang berkas…`);
const uploaded = spawnSync("gh", ["release", "upload", tag, ...wanted, "--clobber"], {
  shell: true,
  stdio: "inherit",
});
process.exit(uploaded.status ?? 1);
