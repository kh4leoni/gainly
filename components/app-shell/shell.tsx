"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "./nav-link";
import { CoachSettingsButton } from "./coach-settings";
import { SyncBar } from "@/components/offline/sync-bar";
import { usePendingNav } from "@/lib/nav-context";
import { CoachSkeleton } from "./coach-skeleton";
import { createClient } from "@/lib/supabase/client";
import { getUnreadCount } from "@/lib/queries/messages";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: ReactNode; label: string; badge?: number; mobilePrimary?: boolean };
type Me = { id: string; full_name: string | null; email?: string | null } | null;

export function AppShell({
  title,
  nav,
  children,
  rightSlot,
  variant = "coach",
  me,
  coBrandLabel,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  rightSlot?: ReactNode;
  variant?: "athlete" | "coach";
  me?: Me;
  coBrandLabel?: string | null;
}) {
  const logoSrc = coBrandLabel ? "/fs%20collab.png" : "/LOGO_gainly.png";
  const logoAlt = coBrandLabel ? `Gainly × ${coBrandLabel}` : "Gainly";

  // Gainly pink accent is a co-brand feature: apply it only when this coach has
  // a co-brand label (e.g. "Gainly × Fanni Savela"). Default stays neutral.
  // Mirrors the client shell so coach-side surfaces (e.g. the program editor)
  // follow the same rule instead of being pink for everyone.
  useEffect(() => {
    const root = document.documentElement;
    if (coBrandLabel) root.classList.add("gainly-cobrand");
    else root.classList.remove("gainly-cobrand");
    return () => { root.classList.remove("gainly-cobrand"); };
  }, [coBrandLabel]);

  const pathname = usePathname();
  const { pendingHref, setPendingHref } = usePendingNav();
  const coachPending = pendingHref?.startsWith("/coach/") ? pendingHref : null;
  const [moreOpen, setMoreOpen] = useState(false);

  const msgHref = nav.find(n => n.href.endsWith("/messages"))?.href ?? "";
  const serverBadge = nav.find(n => n.href === msgHref)?.badge ?? 0;
  const onMessages = !!msgHref && (pendingHref?.startsWith(msgHref) || pathname.startsWith(msgHref));

  // Track unread count in React Query so it updates immediately when messages
  // are marked read — without waiting for the router cache to invalidate.
  const supabase = createClient();
  const { data: liveUnread = serverBadge } = useQuery({
    queryKey: ["unread-count", me?.id],
    queryFn: () => me ? getUnreadCount(supabase, me.id) : Promise.resolve(0),
    initialData: serverBadge,
    initialDataUpdatedAt: Date.now(),
    enabled: !!me?.id,
    staleTime: 30_000,
  });
  const qc = useQueryClient();
  useEffect(() => {
    if (onMessages && me?.id) {
      qc.setQueryData<number>(["unread-count", me.id], 0);
    }
  }, [onMessages, qc, me?.id]);

  const msgBadge = onMessages ? 0 : liveUnread;

  const navWithBadge = nav.map(n =>
    n.href === msgHref ? { ...n, badge: msgBadge } : n
  );

  // Mobile bottom bar: when the layout marks primaries, show those + a "Lisää"
  // overflow sheet for the rest (6+ icons don't fit a phone bar). Otherwise show
  // everything inline (athlete shell, small navs).
  const mobilePrimaries = navWithBadge.filter((n) => n.mobilePrimary);
  const useOverflow = mobilePrimaries.length > 0;
  const mobileMain = useOverflow ? mobilePrimaries : navWithBadge;
  const mobileRest = useOverflow ? navWithBadge.filter((n) => !n.mobilePrimary) : [];
  const restActive = mobileRest.some((n) => pathname === n.href || pathname.startsWith(n.href + "/"));

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (md+) — narrow icon rail that expands on hover. The aside keeps
          a fixed w-16 footprint in the layout; the panel inside overlays the
          main area when expanded so content doesn't reflow under the cursor. */}
      <aside className="relative hidden w-16 shrink-0 md:block">
        <div className="group/sb absolute inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden border-r bg-background transition-[width] duration-200 ease-out hover:w-60">
          <div style={{ height: "calc(env(safe-area-inset-top, 0px) + 8px)" }} />
          <nav className="flex flex-col gap-1 p-2 pt-3">
            {navWithBadge.map((n) => (
              <NavLink key={n.href} {...n} variant={variant} rail />
            ))}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="relative flex h-dvh flex-1 flex-col">
        {/* Mobile top header */}
        <header className="flex shrink-0 flex-col border-b md:hidden" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <Link href="/" prefetch>
              <Image src={logoSrc} alt={logoAlt} width={140} height={44} className="logo-adaptive" style={{ objectFit: "contain" }} />
            </Link>
            <div className="flex items-center gap-2">
              {rightSlot}
              <CoachSettingsButton me={me ?? null} />
            </div>
          </div>
        </header>
        {/* Desktop top header — overlays main so scrolled content passes
            under the progressive blur. pointer-events disabled on the bar
            itself so content beneath stays clickable; re-enabled per child. */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-14 items-center justify-between px-4 md:flex md:px-6">
          {/* Progressive blur: stacked layers, blur strongest at top, fading
              to clear at the bottom edge (mask bands at 20/40/60/80%). */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0" style={{ backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)", maskImage: "linear-gradient(to top, transparent 20%, black 40%)", WebkitMaskImage: "linear-gradient(to top, transparent 20%, black 40%)" }} />
            <div className="absolute inset-0" style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", maskImage: "linear-gradient(to top, transparent 40%, black 60%)", WebkitMaskImage: "linear-gradient(to top, transparent 40%, black 60%)" }} />
            <div className="absolute inset-0" style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", maskImage: "linear-gradient(to top, transparent 60%, black 80%)", WebkitMaskImage: "linear-gradient(to top, transparent 60%, black 80%)" }} />
            <div className="absolute inset-0" style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", maskImage: "linear-gradient(to top, transparent 80%, black 100%)", WebkitMaskImage: "linear-gradient(to top, transparent 80%, black 100%)" }} />
          </div>
          <Link href="/" prefetch className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center" style={{ marginTop: 6 }}>
            <Image src={logoSrc} alt={logoAlt} width={120} height={38} className="logo-adaptive" style={{ objectFit: "contain" }} />
          </Link>
          <div className="pointer-events-auto ml-auto flex items-center gap-2">
            {rightSlot}
            <CoachSettingsButton me={me ?? null} />
          </div>
        </header>
        {variant === "athlete" && <div className="relative h-0 z-30"><SyncBar /></div>}
        <main className="flex-1 overflow-y-auto relative flex flex-col md:pt-14">
          {coachPending ? (
            <CoachSkeleton href={coachPending} />
          ) : (
            <div key={pathname} className="c-fade flex-1 flex flex-col">
              {children}
            </div>
          )}
        </main>

        {/* Mobile "Lisää" overflow sheet */}
        {useOverflow && moreOpen && (
          <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t bg-background p-2 shadow-2xl"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-muted" />
              {mobileRest.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    prefetch
                    onClick={() => { setPendingHref(n.href); setMoreOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium",
                      active ? "bg-accent text-accent-foreground" : "text-foreground active:bg-muted"
                    )}
                  >
                    <span className={active ? "text-primary" : "text-muted-foreground"}>{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile bottom nav — not fixed, stays at bottom of h-dvh column */}
        <nav className="shrink-0 flex border-t bg-background md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {mobileMain.map((n) => (
            <NavLink key={n.href} {...n} variant={variant} />
          ))}
          {useOverflow && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium",
                restActive ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal size={20} />
              <span className="whitespace-nowrap">Lisää</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
