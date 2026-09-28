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
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: false,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
