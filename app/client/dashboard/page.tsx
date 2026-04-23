import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getTodayWorkout, getClientStreak, getClientCompliance } from "@/lib/queries/workouts";
import { getMe } from "@/lib/queries/profile";
import { ClientDashboardView } from "@/components/client/dashboard-view";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const qc = getQueryClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = auth.user?.id;

  if (clientId) {
    await Promise.all([
      qc.prefetchQuery({ queryKey: ["me"],                    queryFn: () => getMe(supabase) }),
      qc.prefetchQuery({ queryKey: ["today", clientId],       queryFn: () => getTodayWorkout(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["streak", clientId],      queryFn: () => getClientStreak(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["compliance", clientId],  queryFn: () => getClientCompliance(supabase, clientId) }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ClientDashboardView clientId={clientId ?? ""} />
    </HydrationBoundary>
  );
}
