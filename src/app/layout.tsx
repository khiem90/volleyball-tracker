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
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${oswald.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
