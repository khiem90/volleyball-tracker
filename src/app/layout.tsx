import type { Metadata, Viewport } from "next";
import { Outfit, Oswald } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tournament Tracker - Manage Your Competitions",
  description: "A flexible tournament management app. Track scores, manage teams, and organize competitions for any sport.",
  keywords: ["tournament", "score", "tracker", "sports", "competition", "bracket"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tournaments",
  },
  icons: {
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

/* ===========================================================================
   THE VIEWPORT COMMIT (charter H6)

   Three changes that only make sense together, which is why they land in one
   edit:

     maximumScale / userScalable REMOVED. Locked zoom is a WCAG 1.4.4 failure
       and it removed the user's only escape from the 0.6rem display steps this
       system uses for kickers and badge captions. The double-tap-to-zoom risk
       it was buying protection against is covered instead by
       `touch-action: manipulation`, which `globals.css` already carries on
       `.mb-btn`, `.mb-nav-item` and `.mb-console-column` (Appendix A, D-14).

     viewportFit: "cover". Required before `env(safe-area-inset-*)` reports
       anything but 0. It also extends content under the notch on every screen
       at once, so every fixed/sticky edge element has to be padded in the same
       commit (shell brief R5) — `.mb-safe-top` / `.mb-safe-bottom` on the top
       strip, the bottom bar, the sidebar, the public header and the event bar;
       `.mb-action-bar`, `.mb-dialog-foot`, `.mb-sheet` and `.mb-skip-link`
       already pad themselves.

     themeColor navy. `#0f172a` is Tailwind slate-900 — neither the Matchbook
       navy nor anything else in the palette (shell brief W24).
   =========================================================================== */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07324d",
};

/**
 * The next/font variable classes belong on <html>, NOT <body>: globals.css
 * resolves --font-outfit / --font-oswald inside `:root`. See the "Typeface
 * plumbing" note at the top of globals.css before moving them.
 *
 * `data-mb-touch="on"` ARMS the coarse-pointer 44px floor. The rule set has
 * been in `globals.css` since P0 gated behind this attribute, and the attribute
 * had no writer anywhere in `src/` — so `.mb-btn` shipped at 38.8px and
 * `.mb-panel-link` at 17.3px on every phone, which is rubric HF-2. P0 could not
 * arm it without breaking its own "no visual change" contract; this is the
 * commit that was waiting for.
 *
 * `className="light"` is the dark-mode decision (charter, Appendix A, D-15):
 * `.matchbook-surface` has no dark form, so any surviving shadcn dialog opened
 * from a Matchbook page could otherwise render dark on cream. `ThemeContext`
 * and the `.dark` block are deleted in P4, not here.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${outfit.variable} ${oswald.variable}`}
      data-mb-touch="on"
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
