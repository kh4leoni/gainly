import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getClientSchedule } from "@/lib/queries/workouts";
import { OhjelmaView } from "@/components/client/ohjelma-view";

export const dynamic = "force-dynamic";

export default async function OhjelmaPage() {
  const supabase = await createClient();
  const qc = getQueryClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = auth.user?.id;

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
