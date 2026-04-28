"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUpcomingWorkoutIds, getScheduledWorkout } from "@/lib/queries/workouts";

export function useWorkoutPrefetch(clientId: string) {
  useEffect(() => {
    if (!clientId) return;

    async function prefetch() {
      if (!navigator.onLine) return;
      const supabase = createClient();
      let ids: string[];
      try {
        ids = await getUpcomingWorkoutIds(supabase, clientId);
      } catch {
        return;
      }
      await Promise.allSettled(
        ids.flatMap((id) => [
          getScheduledWorkout(supabase, id),
          fetch(`/client/workout/${id}`, { credentials: "include" }),
        ])
      );
    }

    prefetch();
    window.addEventListener("online", prefetch);
    return () => window.removeEventListener("online", prefetch);
  }, [clientId]);
}
