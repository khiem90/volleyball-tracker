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

/* No maximumScale/userScalable: locking zoom is a WCAG 1.4.4 failure — the
   double-tap-to-zoom risk is covered by `touch-action: manipulation` in
   `globals.css` instead. `viewportFit: "cover"` is required before
   `env(safe-area-inset-*)` reports anything but 0; it also extends content
   under the notch, so every fixed/sticky edge element must keep its
   `.mb-safe-*` padding. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07324d",
};

/**
 * The next/font variable classes belong on <html>, NOT <body>: globals.css
 * resolves --font-outfit / --font-oswald inside `:root`.
 *
 * `data-mb-touch="on"` arms the coarse-pointer 44px hit-target floor gated
 * behind this attribute in `globals.css` — remove it and buttons shrink below
 * the touch minimum on phones.
 *
 * `className="light"` pins the app light: `.matchbook-surface` has no dark
 * form.
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
