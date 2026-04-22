"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  icon,
  label,
  variant = "coach",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  variant?: "athlete" | "coach";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const isAthlete = variant === "athlete";

  return (
    <a
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-150 md:flex-row md:justify-start md:gap-3 md:px-3 md:rounded-md md:text-sm",
        "active:scale-95 transition-transform duration-150",
        isAthlete ? "py-4" : "py-2",
        active
          ? "text-primary border-b-2 border-primary md:border-b-0 md:border-l-2 md:bg-accent md:text-accent-foreground"
          : "text-muted-foreground hover:text-foreground md:border-l-2 md:border-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}