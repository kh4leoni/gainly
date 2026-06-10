import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getClientSchedule } from "@/lib/queries/workouts";
import { getClientMealPlanId, getMealPlanFull, type MealPlanFull } from "@/lib/queries/meals";
import { OhjelmaTabs } from "@/components/client/ohjelma-tabs";

export const dynamic = "force-dynamic";

export default async function OhjelmaPage() {
  const user = await getCachedUser();
  const clientId = user?.id;
  const supabase = await createClient();
  const qc = getQueryClient();

  let mealPlan: MealPlanFull | null = null;

  if (clientId) {
    const [, planId] = await Promise.all([
      qc.prefetchQuery({
        queryKey: ["schedule", clientId],
        queryFn: () => getClientSchedule(supabase, clientId),
      }),
      getClientMealPlanId(supabase, clientId),
    ]);
    if (planId) mealPlan = await getMealPlanFull(supabase, planId);
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <OhjelmaTabs clientId={clientId ?? ""} mealPlan={mealPlan} />
    </HydrationBoundary>
  );
}
