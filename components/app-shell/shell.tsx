"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";
import { BackButton } from "./back-button";
import { ThemeToggle } from "./theme-toggle";
import { LogOut } from "lucide-react";

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
  const rootPaths = nav.map((n) => n.href);

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (md+) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-muted/20">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" prefetch className="flex items-center gap-2">
            <Image src="/logo.png" alt="Gainly" width={80} height={32} className="dark:invert" style={{ objectFit: "contain" }} />
            <span style={{ fontFamily: "var(--font-dancing)", fontSize: "1.2rem", fontWeight: 400, color: "#FF1D8C" }}>{coachName ?? "Valmentaja"}</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} variant={variant} />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
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
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-safe md:hidden">
          <BackButton rootPaths={rootPaths} />
          {nav.map((n) => (
            <NavLink key={n.href} {...n} variant={variant} />
          ))}
        </nav>
      </div>
    </div>
  );
}
