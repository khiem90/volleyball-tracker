import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import {
  MB_SUMMARY_META_FALLBACK,
  fetchSummaryMeta,
  summaryDescription,
  summaryTitle,
} from "./summaryMeta";

/* ===========================================================================
   THE SHARE CARD FOR /summary/[shareCode]

   A layout, not a page, for one reason: `page.tsx` is `"use client"` — it has
   to be, it is a whole interactive report — and `generateMetadata` is a server
   export. A layout is the segment's server half. It adds no markup: the shell
   is the page's, and this returns `children` untouched.

   ------------------------------------------------------------ metadataBase

   `og:image` and `og:url` must be ABSOLUTE or no scraper resolves them, and
   this app has no configured origin. `NEXT_PUBLIC_SITE_URL` wins when a deploy
   sets one; otherwise the request's own `host` is the truth — the route is
   already `ƒ` (server-rendered on demand), so reading a header costs nothing
   it was not already paying.

   ---------------------------------------------------------------- noindex

   A share code is unlisted, it is handed out person to person, and the page
   carries real people's names. `robots: { index: false }` keeps it out of
   search while leaving it fully unfurlable — Open Graph scrapers read the tags
   regardless, which is the whole point of the distinction.
   =========================================================================== */

const origin = async () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}): Promise<Metadata> => {
  const { shareCode } = await params;
  const [base, meta] = await Promise.all([origin(), fetchSummaryMeta(shareCode)]);

  /* The canonical URL is the share code and NOTHING else. `/session/*` has an
     `?admin=<token>` form; a report does not, and must never grow one here —
     metadata is the one surface that gets copied into other people's systems.
     `summaryMeta.test.ts` asserts it. */
  const canonical = `/summary/${encodeURIComponent(shareCode)}`;

  const title = meta ? summaryTitle(meta) : MB_SUMMARY_META_FALLBACK.title;
  const description = meta
    ? summaryDescription(meta)
    : MB_SUMMARY_META_FALLBACK.description;

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      siteName: "Tournament Tracker",
      title,
      description,
      url: canonical,
      /* `images` is deliberately absent: `opengraph-image.tsx` in this folder
         is a file-convention metadata source and Next merges it in, so naming
         one here would be a second answer to the same question. */
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
};

const SummaryLayout = ({ children }: { children: ReactNode }) => children;

export default SummaryLayout;
