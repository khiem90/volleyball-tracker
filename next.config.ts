import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// The service worker precaches public/, and a waiting version keeps serving
// its own copy of the sprite to new page code, which then asks for glyphs the
// old sprite lacks and draws blank icons. A hash of the sprite in its URL
// sends a changed sprite past every old cache.
const spriteVersion = createHash("sha1")
  .update(readFileSync("public/assets/matchbook/icons/sprite.svg"))
  .digest("hex")
  .slice(0, 8);

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  // Reloading on reconnect could land in the middle of a match. A new
  // version waits instead, and the reload banner lets it in on a tap
  // (AppUpdateProvider sends it SKIP_WAITING).
  reloadOnOnline: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: false,
    clientsClaim: true,
    runtimeCaching: [
      // Replaces the default "cross-origin" route, which caught Firestore's
      // listen and write streams. Workbox caches a response by reading its
      // whole body, and a stream's body stays open for minutes. The running
      // worker never ran out of work, so a waiting version could not take
      // over and Reload brought back the old version. Firestore and Auth
      // requests to googleapis.com now skip the service worker.
      {
        urlPattern: ({ sameOrigin, url }) =>
          !sameOrigin && !url.hostname.endsWith(".googleapis.com"),
        handler: "NetworkFirst",
        options: {
          cacheName: "cross-origin",
          expiration: { maxEntries: 32, maxAgeSeconds: 3600 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  env: { NEXT_PUBLIC_SPRITE_VERSION: spriteVersion },
};

export default withPWA(nextConfig);
