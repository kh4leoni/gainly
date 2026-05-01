"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePendingNav } from "@/lib/nav-context";

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
  const { pendingHref, setPendingHref } = usePendingNav();
  const checkHref = pendingHref ?? pathname;
  const active = checkHref === href || checkHref.startsWith(href + "/");
  const isAthlete = variant === "athlete";

  return (
    <Link
      href={href}
      onClick={() => setPendingHref(href)}
      className={cn(
        "group relative overflow-hidden",
        isAthlete && "icon-bounce",
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium md:flex-row md:justify-start md:gap-3 md:px-3 md:rounded-md md:text-sm",
        isAthlete ? "active:scale-95" : "nav-link-coach",
        "md:hover:scale-[1.04]",
        isAthlete ? "py-4" : "py-2",
        active
          ? "text-primary border-b-2 border-primary md:border-b-0 md:border-l-2 md:bg-accent md:text-accent-foreground"
          : "text-muted-foreground hover:text-foreground md:border-l-2 md:border-transparent"
      )}
      style={isAthlete ? { transition: "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), color 150ms ease" } : undefined}
    >
      {/* pink gradient — desktop only */}
      <span
        className="pointer-events-none absolute inset-0 hidden rounded-md opacity-0 group-hover:opacity-100 md:block"
        style={{
          background: "linear-gradient(135deg, rgba(236,72,153,0.13) 0%, rgba(251,207,232,0.07) 100%)",
          transition: "opacity 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
      <span className="relative">{icon}</span>
      <span className="relative">{label}</span>
    </Link>
  );
}
