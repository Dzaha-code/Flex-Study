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
 * Opts the whole app out of Cache Components' static-shell validation.
 *
 * This app cannot satisfy that validation by design, and it is not a `/settings`
 * problem: every screen reads its data from IndexedDB, so `AppBoundary` renders
 * the BootScreen skeleton until the client has mounted. `children` therefore
 * never renders on the server, and the prerendered HTML for *all* routes is the
 * skeleton and nothing else — verified with `scripts/inspect-shell.mjs`.
 *
 * The result was a "dropped segment / could not validate instant navigation"
 * error on every route, pointing at whichever page was open. There is no
 * server-renderable content to put in the shell, so the honest choice is to
 * opt out rather than leave a misleading error or fake a shell.
 *
 * Scope: the mount gate lives here in the root layout, which is the lowest
 * shared point that covers every route. This changes no runtime behaviour and
 * does not affect the build; it only silences a dev-only (warning-level)
 * insight. If the app ever gains real server-rendered content, delete this line
 * so validation resumes.
 */
export const instant = false;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
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
