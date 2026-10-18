/**
 * Builds the native Windows ARM64 bundle (`aarch64-pc-windows-msvc`).
 *
 * The x64 installer already runs on a Windows 11 ARM laptop through emulation,
 * so this is for a native build rather than the only way to run there. Cargo's
 * answer to a missing target is a wall of "can't find crate for `core`" that
 * never mentions what to install, and the linker error for a missing ARM64
 * toolchain is just as opaque — so both prerequisites are checked here, in one
 * place, with the exact command that fixes them.
 */
import { spawnSync } from "node:child_process";

const TARGET = "aarch64-pc-windows-msvc";

if (process.platform !== "win32") {
  console.error(`[flexstudy] ${TARGET} hanya bisa di-build dari Windows.`);
  process.exit(1);
}

const installed = spawnSync("rustup", ["target", "list", "--installed"], {
  encoding: "utf8",
  // `shell` is required so the rustup shim resolves on Windows.
  shell: true,
});

if (installed.status !== 0) {
  console.error(
    [
      "[flexstudy] `rustup` tidak ditemukan.",
      "",
      "Pasang Rust dari https://rustup.rs, lalu jalankan lagi.",
    ].join("\n"),
  );
  process.exit(1);
}

const targets = installed.stdout.split(/\r?\n/).map((line) => line.trim());
if (!targets.includes(TARGET)) {
  console.error(
    [
      `[flexstudy] Target Rust ${TARGET} belum terpasang.`,
      "",
      "  1. rustup target add " + TARGET,
      "  2. Di Visual Studio Installer, tambahkan komponen:",
      "       - MSVC v143 - VS 2022 C++ ARM64 build tools",
      "       - Windows SDK",
      "",
      "Tanpa linker ARM64, kompilasi berhenti di tahap terakhir tanpa",
      "penjelasan yang berguna. Setelah keduanya siap, jalankan lagi",
      "perintah ini.",
    ].join("\n"),
  );
  process.exit(1);
}

const build = spawnSync("npx", ["tauri", "build", "--target", TARGET], {
  stdio: "inherit",
  shell: true,
});

process.exit(build.status ?? 1);
