import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getCoachDashboard } from "@/lib/queries/coach";
import { getMe } from "@/lib/queries/profile";
import { CoachDashboardView } from "@/components/coach/dashboard-view";

export const dynamic = "force-dynamic";

export default async function CoachDashboardPage() {
  const supabase = await createClient();
  const qc = getQueryClient();

  await Promise.all([
    qc.prefetchQuery({ queryKey: ["me"], queryFn: () => getMe(supabase) }),
    qc.prefetchQuery({ queryKey: ["coach", "dashboard"], queryFn: () => getCoachDashboard(supabase) }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CoachDashboardView />
    </HydrationBoundary>
  );
}
