import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getCoachFullDashboard } from "@/lib/queries/coach";
import { getMeCached } from "@/lib/queries/profile";
import { CoachDashboardView } from "@/components/coach/dashboard-view";

export const dynamic = "force-dynamic";

export default async function CoachDashboardPage() {
  const supabase = await createClient();
  const qc = getQueryClient();
  const me = await getMeCached();

  qc.setQueryData(["me"], me);
  if (me) {
    await qc.prefetchQuery({
      queryKey: ["coach", "full-dashboard", me.id],
      queryFn: () => getCoachFullDashboard(supabase, me.id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CoachDashboardView />
    </HydrationBoundary>
  );
}
