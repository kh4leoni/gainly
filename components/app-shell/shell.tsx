import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";

type NavItem = { href: string; icon: ReactNode; label: string };

export function AppShell({
  title,
  nav,
  children,
  rightSlot,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (md+) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-muted/20">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          <Link href="/" prefetch>{title}</Link>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
        <div className="mt-auto p-2">
          <form action="/auth/logout" method="post">
            <button className="w-full rounded-md border border-input px-3 py-2 text-left text-sm hover:bg-accent">
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="font-semibold md:hidden">{title}</div>
          <div className="ml-auto flex items-center gap-3">{rightSlot}</div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </div>
    </div>
  );
}
