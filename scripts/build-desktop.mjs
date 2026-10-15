/**
 * Runs the Next.js build with the desktop flag set.
 *
 * ToApk.md §A3 suggests `cross-env`, but adding a dependency for this is
 * explicitly out of scope, and the document offers this script as the
 * sanctioned alternative. Keeping the flag here means `package.json` needs no
 * OS-specific environment syntax and the command is identical everywhere.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  // `shell` is required so the npx shim resolves on Windows.
  shell: true,
  env: { ...process.env, TAURI_BUILD: "1" },
});

process.exit(result.status ?? 1);
