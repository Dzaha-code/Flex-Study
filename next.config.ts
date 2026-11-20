import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * This machine's own LAN addresses, so a phone on the same Wi-Fi can open the
 * dev server (and `tauri android dev` can load it). Next blocks dev assets for
 * any other origin, which leaves the phone on a blank page. Read at startup, so
 * a new network only needs a dev server restart; nothing here ships in a build.
 */
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

/**
 * The desktop build is opt-in behind `TAURI_BUILD=1` so the Vercel build keeps
 * behaving exactly as before (ToApk.md §A2). `tauri dev` serves the app from
 * the Next dev server, while `tauri build` consumes the static `out/` export.
 */
const isDesktop = process.env.TAURI_BUILD === "1";
const isProd = process.env.NODE_ENV === "production";
const devHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  /**
   * `cacheComponents` and `partialPrefetching` are deliberately absent.
   *
   * Cache Components enables PPR, and `next build` refuses to mix PPR with
   * `output: 'export'`:
   *
   *   Error: Invariant: PPR cannot be enabled in export mode
   *
   * The desktop bundle needs the export, so the choice was between two build
   * behaviours or one. One won: this app has no server-rendered content to
   * prerender — every screen reads IndexedDB and `AppBoundary` renders the
   * BootScreen skeleton until the client mounts (see scripts/inspect-shell.mjs,
   * which shows all routes export as skeleton only). PPR therefore buys nothing
   * here, while it also forced `export const instant = false` into the root
   * layout, since that config may only be used with Cache Components enabled.
   *
   * Removing it also removes the "dropped segment / could not validate instant
   * navigation" insight that appeared on every route in dev, because that
   * validation is part of Cache Components.
   *
   * Do not re-enable these without dropping `output: 'export'` — the two are
   * mutually exclusive.
   */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // Static export, only for the desktop bundle.
  ...(isDesktop && {
    output: "export",
    images: { unoptimized: true },
    // Emits directory-style URLs, which is what the bundled web server expects.
    trailingSlash: true,
  }),

  // While running under `tauri dev`, assets resolve against the dev server.
  ...(!isProd &&
    isDesktop && {
      assetPrefix: `http://${devHost}:3000`,
    }),
};

export default nextConfig;
