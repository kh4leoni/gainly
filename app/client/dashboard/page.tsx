import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getNextWorkout, getWeeklyVolume, getWeeklyCompletion } from "@/lib/queries/workouts";
import { getMeCached } from "@/lib/queries/profile.server";
import { ClientDashboardView } from "@/components/client/dashboard-view";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const qc = getQueryClient();
  const me = await getMeCached();
  const clientId = me?.id;
  const firstName = me?.full_name?.split(" ")[0] ?? null;

  if (clientId) {
    await Promise.all([
      qc.prefetchQuery({ queryKey: ["next-workout", clientId],       queryFn: () => getNextWorkout(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["weekly-volume", clientId],      queryFn: () => getWeeklyVolume(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["weekly-completion", clientId],  queryFn: () => getWeeklyCompletion(supabase, clientId) }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ClientDashboardView clientId={clientId ?? ""} firstName={firstName} />
    </HydrationBoundary>
  );
}
