import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getTodayWorkout, getRecentPRs, getUpcomingWorkouts } from "@/lib/queries/workouts";
import { getUnreadCount } from "@/lib/queries/messages";
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
      qc.prefetchQuery({ queryKey: ["me"],       queryFn: () => getMe(supabase) }),
      qc.prefetchQuery({ queryKey: ["today", clientId],    queryFn: () => getTodayWorkout(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["prs", clientId],      queryFn: () => getRecentPRs(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["upcoming", clientId], queryFn: () => getUpcomingWorkouts(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["unread"],             queryFn: () => getUnreadCount(supabase, clientId) }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ClientDashboardView clientId={clientId ?? ""} />
    </HydrationBoundary>
  );
}
