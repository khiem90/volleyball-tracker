import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// The one typeface, as a variable font, so every weight from 300 to 900 is one file.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tournament Tracker - Manage Your Competitions",
  description: "A flexible tournament management app. Track scores, manage teams, and organize competitions for any sport.",
  keywords: ["tournament", "score", "tracker", "sports", "competition", "bracket"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // Dark status bar text on the paper design; white text would vanish on it.
    statusBarStyle: "default",
    title: "Tournaments",
  },
  icons: {
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

// Cover fit lets the page run under the notch and the home indicator; the
// shell and the scoring page pad themselves clear of both with the
// safe-area insets. The theme color is the matchbook paper.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f7f0e4",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The font's variable goes on <html> because the stylesheet's theme reads it
  // on :root. On <body> it is one element too low and no screen gets the face.
  return (
    <html lang="en" className={figtree.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
