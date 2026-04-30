import { SquaresFour, Users, Barbell, BookOpen, Chat } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell/shell";
import { getMeCached } from "@/lib/queries/profile.server";

const nav = [
  { href: "/coach/dashboard", icon: <SquaresFour size={20} weight="fill" />, label: "Dashboard"   },
  { href: "/coach/clients",   icon: <Users       size={20} weight="fill" />, label: "Asiakkaat"   },
  { href: "/coach/programs",  icon: <BookOpen    size={20} weight="fill" />, label: "Ohjelmat"    },
  { href: "/coach/exercises", icon: <Barbell     size={20} weight="fill" />, label: "Liikepankki" },
  { href: "/coach/messages",  icon: <Chat        size={20} weight="fill" />, label: "Viestit"     },
];

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const me = await getMeCached();
  return (
    <AppShell title="Gainly" nav={nav} variant="coach" me={me}>
      {children}
    </AppShell>
  );
}
