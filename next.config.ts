import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TÄMÄ LISÄTTY: Sallitaan localtunnelin osoite
  experimental: {
    allowedDevOrigins: ["flat-pots-act.loca.lt"],
  },
};

export default withSerwist(nextConfig);