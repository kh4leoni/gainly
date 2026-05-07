import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: isDev,
});

// Preserve full origin (protocol + host + port) so local Supabase on
// http://127.0.0.1:54321 isn't blocked by a hardcoded https:// prefix.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "https://*.supabase.co";
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");
const supabaseStorageOrigin = supabaseOrigin; // storage lives on same origin

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${supabaseStorageOrigin}`,
  // In dev, also allow any LAN IP on Supabase's port so phone testing works
  // regardless of whether NEXT_PUBLIC_SUPABASE_URL uses 127.0.0.1 or the machine's LAN IP.
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}${isDev ? " http://*:54321 ws://*:54321" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy",    value: csp },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
