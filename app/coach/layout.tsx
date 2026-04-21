import { LayoutDashboard, Users, Dumbbell, BookOpen, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell/shell";

const ICON = "h-5 w-5";
const nav = [
  { href: "/coach/dashboard", icon: <LayoutDashboard className={ICON} />, label: "Dashboard" },
  { href: "/coach/clients",   icon: <Users           className={ICON} />, label: "Clients"   },
  { href: "/coach/programs",  icon: <BookOpen        className={ICON} />, label: "Programs"  },
  { href: "/coach/exercises", icon: <Dumbbell        className={ICON} />, label: "Exercises" },
  { href: "/coach/messages",  icon: <MessageSquare   className={ICON} />, label: "Messages"  },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Gainly" nav={nav}>{children}</AppShell>;
}
