import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { AppBoundary } from "@/components/app-boundary";
import { AppProviders } from "@/components/app-providers";
import { themeBootstrapScript } from "@/lib/preferences";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

// Two families only: Bricolage Grotesque for headings, Figtree for everything
// else. No monospace: numbers use tabular figures on the body face instead.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlexStudy",
  description:
    "Susun hari dalam blok waktu yang realistis, dan sesuaikan tanpa rasa bersalah ketika rencana bergeser.",
  applicationName: "FlexStudy",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // The pre-paint script and the client sync both touch `class`/`style`, so
      // the mismatch is expected and handled.
      suppressHydrationWarning
      className={`${figtree.variable} ${bricolage.variable} h-full`}
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
