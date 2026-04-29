import { getCachedUser } from "@/lib/supabase/server";
import { HistoryView } from "@/components/client/history-view";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCachedUser();
  const clientId = user?.id ?? "";
  return <HistoryView clientId={clientId} />;
}
