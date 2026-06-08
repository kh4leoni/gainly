"use client";

import { useCallback, useEffect, useState } from "react";
import { changelogFor, latestEntryId, type ChangelogRole } from "@/lib/changelog";

const seenKey = (role: ChangelogRole) => `gainly:changelog-seen:${role}`;

/**
 * Tracks whether the user has unread "Uutta Gainlyssä" entries for their role.
 * Seen-state is the id of the newest entry the user has opened, stored in
 * localStorage. A new entry at the top of the list changes the latest id, which
 * re-surfaces the dot until the panel is opened again.
 */
export function useChangelog(role: ChangelogRole) {
  const entries = changelogFor(role);
  const latest = latestEntryId(role);
  const [seen, setSeen] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(seenKey(role)));
    } catch {
      // localStorage may be unavailable (private mode); treat as nothing seen.
    }
    setHydrated(true);
  }, [role]);

  const markRead = useCallback(() => {
    if (!latest) return;
    try {
      localStorage.setItem(seenKey(role), latest);
    } catch {
      // ignore write failures
    }
    setSeen(latest);
  }, [role, latest]);

  // Only claim "unread" after hydration so SSR/first paint never flashes a dot.
  const hasUnread = hydrated && latest !== null && seen !== latest;

  return { entries, hasUnread, markRead };
}
