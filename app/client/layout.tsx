import { getMeCached, getMyCoachCached } from "@/lib/queries/profile.server";
import { ClientShell } from "@/components/client/client-shell";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/queries/messages";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [me, coach] = await Promise.all([
    getMeCached(),
    getMyCoachCached(),
  ]);
  const unread = me ? await getUnreadCount(supabase, me.id) : 0;
  return (
    <ClientShell me={me} coach={coach} unreadMessages={unread}>
      {children}
    </ClientShell>
  );
}
