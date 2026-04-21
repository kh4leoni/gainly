import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getExercises } from "@/lib/queries/exercises";
import { ExerciseLibrary } from "@/components/exercises/library";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const qc = getQueryClient();
  await qc.prefetchQuery({ queryKey: ["exercises"], queryFn: () => getExercises(supabase) });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ExerciseLibrary />
    </HydrationBoundary>
  );
}
