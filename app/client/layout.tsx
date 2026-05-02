import { getMeCached, getMyCoachCached, getMyBodyweightHistoryCached, getMyWaistHistoryCached } from "@/lib/queries/profile.server";
import { ClientShell } from "@/components/client/client-shell";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/queries/messages";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [me, coach, bwHistory, waistHistory] = await Promise.all([
    getMeCached(),
    getMyCoachCached(),
    getMyBodyweightHistoryCached(),
    getMyWaistHistoryCached(),
  ]);
  const unread = me ? await getUnreadCount(supabase, me.id) : 0;
  return (
    <ClientShell me={me} coach={coach} bwHistory={bwHistory} waistHistory={waistHistory} unreadMessages={unread}>
      {children}
    </ClientShell>
  );
}
