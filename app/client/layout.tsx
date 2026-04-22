"use client";

import { LayoutDashboard, CalendarDays, TrendingUp, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell/shell";

const ICON = "h-6 w-6";
const nav = [
  { href: "/client/dashboard", icon: <LayoutDashboard className={ICON} />, label: "Tänään"     },
  { href: "/client/calendar",  icon: <CalendarDays    className={ICON} />, label: "Kalenteri"  },
  { href: "/client/progress",  icon: <TrendingUp      className={ICON} />, label: "Edistyminen"  },
  { href: "/client/messages",  icon: <MessageSquare   className={ICON} />, label: "Viestit"  },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Gainly" nav={nav} variant="athlete">{children}</AppShell>;
}
