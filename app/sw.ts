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
      matcher: ({ url }) => url.pathname.startsWith("/client/workout/"),
      handler: new NetworkFirst({
        cacheName: "workout-pages",
        networkTimeoutSeconds: 5,
      }),
    },
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

// ── Web Push ────────────────────────────────────────────────────────
type PushPayload = { title?: string; body?: string; url?: string; tag?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try { data = event.data?.json() ?? {}; } catch { /* keep defaults */ }
  const title = data.title || "Gainly";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Reuse an existing tab if any is already on our origin.
    const existing = all.find((c) => "focus" in c);
    if (existing) {
      await (existing as WindowClient).focus();
      (existing as WindowClient).navigate(target).catch(() => { /* cross-origin guard */ });
      return;
    }
    await self.clients.openWindow(target);
  })());
});

void supabaseUrl;
