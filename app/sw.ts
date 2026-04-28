/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const supabaseUrl = (self as unknown as { __SUPABASE_URL?: string }).__SUPABASE_URL;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
      }),
    },
    {
      matcher: /\/rest\/v1\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "supabase-rest",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => (response.status === 200 ? response : null),
          },
        ],
      }),
    },
    {
      matcher: /\/storage\/v1\/object\/.*/i,
      handler: new CacheFirst({
        cacheName: "supabase-storage",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => (response.status === 200 ? response : null),
          },
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOW") {
    void self.clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "SYNC_NOW" }));
    });
  }
});

self.addEventListener("sync", (event) => {
  const e = event as ExtendableEvent & { tag?: string };
  if (e.tag === "gainly-sync") {
    e.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "SYNC_NOW" }));
      })
    );
  }
});

void supabaseUrl;
