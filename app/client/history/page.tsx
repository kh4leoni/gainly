import { createClient } from "@/lib/supabase/server";
import { HistoryView } from "@/components/client/history-view";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = auth.user?.id ?? "";
  return <HistoryView clientId={clientId} />;
}
