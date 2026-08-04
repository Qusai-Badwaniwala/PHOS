import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker-registration";
import { StorageBootstrap } from "@/components/layout/storage-bootstrap";
import { withBasePath } from "@/shared/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "PHOS — Personal Hifz Operating System",
    template: "%s · PHOS",
  },
  description:
    "A calm, minimal, and scientifically informed companion for memorizing the Quran. Built for focus, not administration.",
  keywords: ["Quran", "Hifz", "Memorization", "Islamic", "Spaced Repetition"],
  applicationName: "PHOS",
  // Lets iOS launch PHOS full-screen from the home screen, matching the
  // manifest's `display: standalone` on other platforms.
  appleWebApp: {
    capable: true,
    title: "PHOS",
    statusBarStyle: "default",
  },
  /*
   * Every URL here goes through `withBasePath()`.
   *
   * Next rewrites the links *it* generates — `next/link`, and the app's
   * own routes — but not the strings inside `metadata`, and not the
   * manifest link it injects from `app/manifest.ts`. Served from
   * `/PHOS/` on GitHub Pages, all of these resolved to the domain root
   * and 404'd: the favicons, the touch icon, and — worst — the
   * manifest, without which a browser will not offer to install PHOS as
   * an app at all.
   *
   * Found on a phone, where the About page showed a broken-image icon.
   * `scripts/verify-base-path.mjs` now checks the built output for this
   * whole class of mistake.
   */
  manifest: withBasePath("/manifest.webmanifest"),
  icons: {
    icon: [
      { url: withBasePath("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: withBasePath("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: withBasePath("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFE9E1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1614" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ServiceWorkerRegistration />
        <StorageBootstrap />
        <ThemeProvider defaultTheme="system">
          <SettingsProvider>
            <AppShell>{children}</AppShell>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
