import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { AppBoundary } from "@/components/app-boundary";
import { AppProviders } from "@/components/app-providers";
import { themeBootstrapScript } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "FlexStudy",
  description:
    "Susun hari dalam blok waktu yang realistis, dan sesuaikan tanpa rasa bersalah ketika rencana bergeser.",
  applicationName: "FlexStudy",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111412" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * No `instant` route segment config here, deliberately.
 *
 * `instant` may only be used while `cacheComponents` is enabled, and Cache
 * Components enables PPR, which `output: 'export'` cannot support. The app is
 * entirely client-rendered — every screen reads IndexedDB and `AppBoundary`
 * shows the BootScreen skeleton until the client mounts — so there is no
 * server-renderable content for PPR to prerender, and nothing to opt out of.
 * See next.config.ts.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The pre-paint script sets `data-theme`, so the attribute differs from
      // the server-rendered markup by design.
      suppressHydrationWarning
      className={`${fontVariables} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full">
        <AppProviders>
          <AppBoundary>{children}</AppBoundary>
        </AppProviders>
      </body>
    </html>
  );
}
