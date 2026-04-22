"use client";

import { Users, Dumbbell, BookOpen, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell/shell";

const ICON = "h-5 w-5";
const nav = [
  { href: "/coach/clients",   icon: <Users           className={ICON} />, label: "Asiakkaat"   },
  { href: "/coach/programs",  icon: <BookOpen        className={ICON} />, label: "Ohjelmat"  },
  { href: "/coach/exercises", icon: <Dumbbell        className={ICON} />, label: "Liikepankki" },
  { href: "/coach/messages",  icon: <MessageSquare   className={ICON} />, label: "Viestit"  },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Gainly" nav={nav} variant="coach">{children}</AppShell>;
}
