import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import {
  MB_SUMMARY_META_FALLBACK,
  fetchSummaryMeta,
  summaryDescription,
  summaryTitle,
} from "./summaryMeta";

/* Share-card metadata for /summary/[shareCode]. A layout because `page.tsx`
   is "use client" and `generateMetadata` is a server export — this is the
   segment's server half, and it returns `children` untouched.

   `og:image`/`og:url` must be absolute: `NEXT_PUBLIC_SITE_URL` wins when set,
   otherwise the request's own host (the route is server-rendered on demand
   anyway). `robots: { index: false }` keeps an unlisted code carrying real
   names out of search while staying fully unfurlable. */

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
