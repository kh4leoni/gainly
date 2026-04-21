import { defaultCache } from "@serwist/next/worker";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  Serwist,
} from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Supabase REST: stale-while-revalidate for fast reads that still refresh.
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/"),
      handler: new StaleWhileRevalidate({
        cacheName: "supabase-rest",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
        ],
      }),
      method: "GET",
    },
    // Supabase Storage: cache signed URLs for an hour.
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/"),
      handler: new CacheFirst({ cacheName: "supabase-storage" }),
      method: "GET",
    },
    // Next-generated data (RSC payloads).
    {
      matcher: ({ request, url }) =>
        request.destination === "" && url.pathname.startsWith("/_next/data/"),
      handler: new NetworkFirst({ cacheName: "next-data", networkTimeoutSeconds: 3 }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Background Sync for queued mutations: service worker just notifies the app.
self.addEventListener("sync", (event: any) => {
  if (event.tag === "gainly-sync") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: "gainly-sync" });
        }
      })()
    );
  }
});

serwist.addEventListeners();
