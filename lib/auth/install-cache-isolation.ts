"use client";

import { createClient } from "@/lib/supabase/client";

const LAST_USER_KEY = "gainly_last_user_id";
// Per-user-bound localStorage entries to clear together with caches.
// Keep this list narrow — generic prefs like `theme` should survive a
// user switch.
const USER_SCOPED_STORAGE_KEYS = ["gainly_last_path"];

// Wipe every CacheStorage bucket the service worker maintains AND the
// offline IndexedDB. Without nuking Dexie, the next user's first sync
// would try to push the previous user's pending workout / set rows
// under the new JWT (server RLS rejects them, but the queue would
// retry forever and grow).
async function wipeAllCaches() {
  if (typeof window === "undefined") return;
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // Caches API can throw in private mode; swallow.
    }
  }
  // Drop the entire offline Dexie database. Easier to delete than to
  // selectively clear per-table, and the next page load reopens it
  // empty via getDB().
  try {
    if ("indexedDB" in window) {
      // Reset the module-level Dexie singleton if it's been opened
      // already, otherwise the open connection will block the delete.
      const mod = await import("@/lib/offline/db");
      try { (mod as { _resetDB?: () => void })._resetDB?.(); } catch { /* ignore */ }
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("gainly-offline");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  } catch { /* ignore */ }
  for (const k of USER_SCOPED_STORAGE_KEYS) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

// Listens for Supabase auth state changes and, whenever the active user
// id flips (login as new user, logout, or login after a previous user
// signed out on this device), nukes every SW cache bucket so the next
// online request rehydrates the cache from a clean slate.
//
// Without this, StaleWhileRevalidate on `/rest/v1/**` and NetworkFirst
// on navigations cause one user's responses to be served to the next
// user when offline — a privacy bug, not an auth bypass (writes still
// flow through the live JWT) but obviously not acceptable.
export function installCacheIsolation(): () => void {
  if (typeof window === "undefined") return () => {};
  const supabase = createClient();

  // Snap-fire on mount. `getSession()` reads from cookies / localStorage
  // synchronously-ish — no network — so this works offline. `getUser()`
  // would have hung or returned null in airplane mode, defeating the
  // whole point: a stale cache from a previous user would never get
  // wiped because the local snapshot couldn't be compared.
  void (async () => {
    const { data } = await supabase.auth.getSession();
    const currentId = data.session?.user?.id ?? null;
    const last = (() => { try { return localStorage.getItem(LAST_USER_KEY); } catch { return null; } })();
    if (last !== currentId) {
      await wipeAllCaches();
      try {
        if (currentId) localStorage.setItem(LAST_USER_KEY, currentId);
        else localStorage.removeItem(LAST_USER_KEY);
      } catch { /* ignore */ }
      // After wiping, reload so the freshly-rendered pages don't keep
      // displaying the stale data the user reported before the swap.
      // Skip on the initial mount when `last` was already null (first
      // ever launch) — nothing to swap from.
      if (last !== null) {
        window.location.reload();
      }
    }
  })();

  const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    const currentId = session?.user?.id ?? null;
    const last = (() => { try { return localStorage.getItem(LAST_USER_KEY); } catch { return null; } })();
    if (last === currentId) return; // same user across refresh — keep cache
    await wipeAllCaches();
    try {
      if (currentId) localStorage.setItem(LAST_USER_KEY, currentId);
      else localStorage.removeItem(LAST_USER_KEY);
    } catch { /* ignore */ }
  });

  return () => { sub.subscription.unsubscribe(); };
}
