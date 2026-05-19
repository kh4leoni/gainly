"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getUpcomingWorkoutIds,
  getScheduledWorkout,
  getNextWorkout,
  getWeeklyVolume,
  getWeeklyCompletion,
  getLatestPRs,
  getClientSchedule,
  getPastWorkouts,
  getRecentPRs,
  getCardioRecords,
} from "@/lib/queries/workouts";
import { getThreads } from "@/lib/queries/messages";
import { markPrefetched } from "@/lib/prefetched-paths";

const TAB_PATHS = [
  "/client/dashboard",
  "/client/ohjelma",
  "/client/progress",
  "/client/history",
  "/client/messages",
] as const;

export function useWorkoutPrefetch(clientId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!clientId) return;

    async function prefetch() {
      if (!navigator.onLine) return;
      const supabase = createClient();

      // Warm RSC payloads for all tab pages — Next caches them so navigation
      // is instant on click. Mark each as prefetched so we can skip the
      // pendingHref skeleton.
      await Promise.allSettled(
        TAB_PATHS.map((p) =>
          fetch(p, { credentials: "include" }).then((r) => {
            if (r.ok) markPrefetched(p);
          })
        )
      );

      // Warm React Query cache for every tab's data so useQuery/useSuspenseQuery
      // resolve instantly when the user opens the tab.
      await Promise.allSettled([
        qc.prefetchQuery({ queryKey: ["next-workout", clientId],      queryFn: () => getNextWorkout(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["weekly-volume", clientId],     queryFn: () => getWeeklyVolume(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["weekly-completion", clientId], queryFn: () => getWeeklyCompletion(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["latest-prs", clientId],        queryFn: () => getLatestPRs(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["schedule", clientId],          queryFn: () => getClientSchedule(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["past-workouts", clientId],     queryFn: () => getPastWorkouts(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["prs", clientId, "all"],        queryFn: () => getRecentPRs(supabase, clientId, 250) }),
        qc.prefetchQuery({ queryKey: ["cardio-prs", clientId],        queryFn: () => getCardioRecords(supabase, clientId) }),
        qc.prefetchQuery({ queryKey: ["threads", clientId],           queryFn: () => getThreads(supabase, clientId) }),
      ]);

      // Warm upcoming workout detail pages too.
      let ids: string[];
      try {
        ids = await getUpcomingWorkoutIds(supabase, clientId);
      } catch {
        return;
      }
      await Promise.allSettled(
        ids.flatMap((id) => [
          getScheduledWorkout(supabase, id),
          fetch(`/client/workout/${id}`, { credentials: "include" }).then((r) => {
            if (r.ok) markPrefetched(`/client/workout/${id}`);
          }),
        ])
      );
    }

    prefetch();
    window.addEventListener("online", prefetch);
    return () => window.removeEventListener("online", prefetch);
  }, [clientId, qc]);
}
