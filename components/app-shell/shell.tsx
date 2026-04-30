"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";
import { LogOut } from "lucide-react";
import { SyncBar } from "@/components/offline/sync-bar";

type NavItem = { href: string; icon: ReactNode; label: string };

export function AppShell({
  title,
  nav,
  children,
  rightSlot,
  variant = "coach",
  coachName,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  rightSlot?: ReactNode;
  variant?: "athlete" | "coach";
  coachName?: string | null;
}) {
  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (md+) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-muted/20">
        <div style={{ height: "calc(env(safe-area-inset-top, 0px) + 8px)" }} />
        <div className="flex h-20 items-center border-b px-4">
          <Link href="/" prefetch>
            <Image src="/fs%20collab.png" alt="fs collab" width={160} height={52} className="logo-adaptive" style={{ objectFit: "contain" }} />
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} variant={variant} />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex h-dvh flex-1 flex-col">
        {/* Mobile top header */}
        <header className="flex shrink-0 flex-col border-b md:hidden" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <Link href="/" prefetch>
              <Image src="/fs%20collab.png" alt="fs collab" width={140} height={44} className="logo-adaptive" style={{ objectFit: "contain" }} />
            </Link>
            <div className="flex items-center gap-1">
              {rightSlot}
              <ThemeToggle />
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="icon-wiggle flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#FF1D8C] hover:text-white"
                  aria-label="Kirjaudu ulos"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </header>
        {/* Desktop top header */}
        <header className="hidden h-14 shrink-0 items-center justify-between border-b px-4 md:flex md:px-6">
          <div className="ml-auto flex items-center gap-1">
            {rightSlot}
            <ThemeToggle />
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="icon-wiggle flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#FF1D8C] hover:text-white"
                aria-label="Kirjaudu ulos"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>
        <div className="relative h-0 z-30"><SyncBar /></div>
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav — not fixed, stays at bottom of h-dvh column */}
        <nav className="shrink-0 flex border-t bg-background md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {nav.map((n) => (
            <NavLink key={n.href} {...n} variant={variant} />
          ))}
        </nav>
      </div>
    </div>
  );
}
