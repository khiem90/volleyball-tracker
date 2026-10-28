import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

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
};

export default withPWA(nextConfig);
