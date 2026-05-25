import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getNextWorkout, getWeeklyVolume, getWeeklyCompletion, getLatestPRs } from "@/lib/queries/workouts";
import { getMeCached, getMyBodyweightHistoryCached } from "@/lib/queries/profile.server";
import { ClientDashboardView } from "@/components/client/dashboard-view";
import { InvitationBanner, type PendingInvitation } from "@/components/client/invitation-banner";
import { BodyweightQuickLog } from "@/components/client/bodyweight-quick-log";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const qc = getQueryClient();
  const me = await getMeCached();
  const clientId = me?.id;
  const firstName = me?.full_name?.split(" ")[0] ?? null;

  const { data: invitesData } = await supabase.rpc("my_pending_invitations");
  const invitations = (invitesData ?? []) as PendingInvitation[];

  const bwHistory = await getMyBodyweightHistoryCached();
  const latestBw = bwHistory[0] ?? null;

  if (clientId) {
    await Promise.all([
      qc.prefetchQuery({ queryKey: ["next-workout", clientId],       queryFn: () => getNextWorkout(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["weekly-volume", clientId],      queryFn: () => getWeeklyVolume(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["weekly-completion", clientId],  queryFn: () => getWeeklyCompletion(supabase, clientId) }),
      qc.prefetchQuery({ queryKey: ["latest-prs", clientId],         queryFn: () => getLatestPRs(supabase, clientId) }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <InvitationBanner invitations={invitations} />
      <ClientDashboardView
        clientId={clientId ?? ""}
        firstName={firstName}
        // Surface the quick-log only after the first manual entry from
        // /client/progress > Kehitys — clients who don't track weight never
        // see this card.
        bwQuickLog={
          latestBw
            ? <BodyweightQuickLog latestKg={latestBw.value} latestLoggedAt={latestBw.logged_at} />
            : null
        }
      />
    </HydrationBoundary>
  );
}
