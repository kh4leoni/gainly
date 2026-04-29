import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getClientSchedule } from "@/lib/queries/workouts";
import { OhjelmaView } from "@/components/client/ohjelma-view";

export const dynamic = "force-dynamic";

export default async function OhjelmaPage() {
  const user = await getCachedUser();
  const clientId = user?.id;
  const supabase = await createClient();
  const qc = getQueryClient();

  if (clientId) {
    await qc.prefetchQuery({
      queryKey: ["schedule", clientId],
      queryFn: () => getClientSchedule(supabase, clientId),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <OhjelmaView clientId={clientId ?? ""} />
    </HydrationBoundary>
  );
}
