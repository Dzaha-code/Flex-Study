/**
 * Builds the Android APK bundle via Tauri.
 *
 * Prerequisites (checked here with actionable messages):
 *   - JAVA_HOME pointing to JDK 17+ (JDK 17 portable: C:\laragon\jdk17\jdk-17.0.15+6)
 *   - ANDROID_HOME pointing to Android SDK
 *   - NDK 27.2.12479018 inside ANDROID_HOME/ndk/
 *   - Four Rust Android targets installed via rustup
 *
 * Usage:
 *   node scripts/build-android.mjs           # release APK
 *   node scripts/build-android.mjs --debug   # debug APK
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const isDebug = process.argv.includes("--debug");
const NDK_VERSION = "27.2.12479018";
const ANDROID_TARGETS = [
  "aarch64-linux-android",
  "armv7-linux-androideabi",
  "x86_64-linux-android",
  "i686-linux-android",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    ...opts,
  });
  return result.status ?? 1;
}

function checkEnv() {
  const errors = [];

  // JDK 17+
  const javaHome = process.env.JAVA_HOME;
  if (!javaHome) {
    errors.push(
      "[flexstudy] JAVA_HOME tidak di-set.\n" +
        "  Set ke JDK 17 portable: C:\\laragon\\jdk17\\jdk-17.0.15+6\n" +
        "  Atau: $env:JAVA_HOME = 'C:\\laragon\\jdk17\\jdk-17.0.15+6'",
    );
  } else {
    const javaExe = path.join(javaHome, "bin", "java.exe");
    if (!existsSync(javaExe)) {
      errors.push(
        `[flexstudy] JAVA_HOME="${javaHome}" tapi java.exe tidak ditemukan.`,
      );
    } else {
      const result = spawnSync(javaExe, ["-version"], {
        encoding: "utf8",
        shell: true,
      });
      const output = (result.stderr || result.stdout || "").toString();
      const match = output.match(/version "(\d+)/);
      const major = match ? parseInt(match[1]) : 0;
      if (major < 17) {
        errors.push(
          `[flexstudy] JAVA_HOME="${javaHome}" menunjuk ke Java ${major}, butuh Java 17+.\n` +
            "  Gunakan JDK 17 portable: C:\\laragon\\jdk17\\jdk-17.0.15+6",
        );
      }
    }
  }

  // Android SDK
  const androidHome =
    process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    errors.push(
      "[flexstudy] ANDROID_HOME tidak di-set.\n" +
        "  Set ke: %LOCALAPPDATA%\\Android\\Sdk",
    );
  } else if (!existsSync(androidHome)) {
    errors.push(`[flexstudy] ANDROID_HOME="${androidHome}" tidak ditemukan.`);
  } else {
    // NDK
    const ndkPath = path.join(androidHome, "ndk", NDK_VERSION);
    if (!existsSync(ndkPath)) {
      errors.push(
        `[flexstudy] NDK ${NDK_VERSION} tidak ditemukan di ${ndkPath}.\n` +
          "  Sudah diinstall di sesi ini — periksa isi folder ndk/",
      );
    }
  }

  // Rust Android targets
  const installed = spawnSync("rustup", ["target", "list", "--installed"], {
    encoding: "utf8",
    shell: true,
  });
  const installedTargets = (installed.stdout || "").split(/\r?\n/);
  const missing = ANDROID_TARGETS.filter(
    (t) => !installedTargets.some((line) => line.trim() === t),
  );
  if (missing.length > 0) {
    errors.push(
      "[flexstudy] Rust Android targets belum terpasang:\n" +
        missing.map((t) => `  rustup target add ${t}`).join("\n"),
    );
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (process.platform !== "win32") {
  console.error("[flexstudy] Script ini hanya untuk Windows.");
  process.exit(1);
}

const errors = checkEnv();
if (errors.length > 0) {
  console.error(errors.join("\n\n"));
  process.exit(1);
}

const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const ndkHome = path.join(sdkPath, "ndk", NDK_VERSION);

// Pastikan NDK_HOME juga di-set untuk Tauri
process.env.NDK_HOME = ndkHome;

const args = ["tauri", "android", "build"];
if (isDebug) args.push("--debug");

console.log(
  `\n[flexstudy] Building Android APK (${isDebug ? "debug" : "release"})...\n` +
    `  JAVA_HOME      = ${process.env.JAVA_HOME}\n` +
    `  ANDROID_HOME   = ${sdkPath}\n` +
    `  NDK_HOME       = ${ndkHome}\n`,
);

const status = run("npx", args);
process.exit(status);
