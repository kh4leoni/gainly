"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";
import { BackButton } from "./back-button";
import { ThemeToggle } from "./theme-toggle";

type NavItem = { href: string; icon: ReactNode; label: string };

export function AppShell({
  title,
  nav,
  children,
  rightSlot,
  variant = "coach",
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  rightSlot?: ReactNode;
  variant?: "athlete" | "coach";
}) {
  const rootPaths = nav.map((n) => n.href);

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (md+) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-muted/20">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" prefetch className="flex items-baseline gap-1.5 font-semibold text-base">
            Gainly x <span style={{ fontFamily: "var(--font-dancing)", fontSize: "1.5rem", fontWeight: 400 }}>Fanni Savela</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} variant={variant} />
          ))}
        </nav>
        <div className="mt-auto p-2">
          <form action="/auth/logout" method="post">
            <button className="w-full rounded-md border border-input px-3 py-2 text-left text-sm hover:bg-accent">
              Kirjaudu ulos
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="ml-auto flex items-center gap-1">
            {rightSlot}
            <ThemeToggle />
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
