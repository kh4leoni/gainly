import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getScheduledWorkout } from "@/lib/queries/workouts";
import { WorkoutLogger } from "@/components/workout-logger/workout-logger";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: ["workout", id],
    queryFn: () => getScheduledWorkout(supabase, id),
  });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <WorkoutLogger scheduledWorkoutId={id} />
    </HydrationBoundary>
  );
}
