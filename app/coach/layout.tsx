import { SquaresFour, Users, Barbell, BookOpen, Chat } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell/shell";
import { getMeCached } from "@/lib/queries/profile.server";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/queries/messages";

export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const me = await getMeCached();
  const supabase = await createClient();
  const unread = me ? await getUnreadCount(supabase, me.id) : 0;

  const nav = [
    { href: "/coach/dashboard", icon: <SquaresFour size={20} weight="fill" />, label: "Dashboard"   },
    { href: "/coach/clients",   icon: <Users       size={20} weight="fill" />, label: "Asiakkaat"   },
    { href: "/coach/programs",  icon: <BookOpen    size={20} weight="fill" />, label: "Ohjelmat"    },
    { href: "/coach/exercises", icon: <Barbell     size={20} weight="fill" />, label: "Liikepankki" },
    { href: "/coach/messages",  icon: <Chat        size={20} weight="fill" />, label: "Viestit", badge: unread },
  ];

  return (
    <AppShell title="Gainly" nav={nav} variant="coach" me={me}>
      {children}
    </AppShell>
  );
}
