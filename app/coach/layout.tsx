import { LayoutDashboard, Users, Dumbbell, BookOpen, MessageCircle, UtensilsCrossed, Table2 } from "lucide-react";
import { AppShell } from "@/components/app-shell/shell";
import { getMeCached } from "@/lib/queries/profile.server";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/queries/messages";

export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const me = await getMeCached();
  const supabase = await createClient();
  const unread = me ? await getUnreadCount(supabase, me.id) : 0;

  // mobilePrimary items stay on the phone bottom bar; the rest fold into "Lisää".
  const nav = [
    { href: "/coach/dashboard", icon: <LayoutDashboard size={20} />, label: "Etusivu", mobilePrimary: true },
    { href: "/coach/clients",   icon: <Users           size={20} />, label: "Asiakkaat", mobilePrimary: true },
    { href: "/coach/programs",  icon: <BookOpen        size={20} />, label: "Ohjelmat"    },
    { href: "/coach/plans",     icon: <Table2          size={20} />, label: "Suunnitelmat" },
    { href: "/coach/meal-plans", icon: <UtensilsCrossed size={20} />, label: "Ruokaohjelmat" },
    { href: "/coach/exercises", icon: <Dumbbell        size={20} />, label: "Liikepankki" },
    { href: "/coach/messages",  icon: <MessageCircle   size={20} />, label: "Viestit", badge: unread, mobilePrimary: true },
  ];

  return (
    <AppShell title="Gainly" nav={nav} variant="coach" me={me} coBrandLabel={me?.co_brand_label ?? null}>
      {children}
    </AppShell>
  );
}
