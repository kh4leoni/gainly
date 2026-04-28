"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { House, CalendarDots, Trophy, ClockCounterClockwise, ChatCircle } from "@phosphor-icons/react";
import { SyncBar } from "@/components/offline/sync-bar";
import { useWorkoutPrefetch } from "@/hooks/use-workout-prefetch";
import type { ReactNode } from "react";

const NAV = [
  { href: "/client/dashboard", label: "Koti",       Icon: House },
  { href: "/client/ohjelma",   label: "Ohjelma",    Icon: CalendarDots },
  { href: "/client/progress",  label: "Ennätykset", Icon: Trophy },
  { href: "/client/history",   label: "Historia",   Icon: ClockCounterClockwise },
  { href: "/client/messages",  label: "Viestit",    Icon: ChatCircle },
] as const;

type Me = { id: string; full_name: string | null } | null;

function initials(name: string | null) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return `${p[0]?.[0] ?? ""}${p[1]?.[0] ?? ""}`.toUpperCase();
}

function avatarColor(seed: string) {
  const palette = ["#ec4899","#f97316","#8b5cf6","#14b8a6","#6366f1","#f43f5e"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length] ?? "#ec4899";
}

const NAV_PATHS = NAV.map((n) => n.href);
function navIndex(path: string) {
  return NAV_PATHS.findIndex((p) => path.startsWith(p));
}

export function ClientShell({ me, coachName, children }: { me: Me; coachName?: string | null; children: ReactNode }) {
  const pathname = usePathname();
  const prevRef = useRef<string | undefined>(undefined);
  const dirRef = useRef("c-ani");

  if (prevRef.current !== pathname) {
    const prev = prevRef.current;
    if (prev !== undefined) {
      const prevIdx = navIndex(prev);
      const currIdx = navIndex(pathname);
      dirRef.current = prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx
        ? currIdx > prevIdx ? "c-slide-right" : "c-slide-left"
        : "c-ani";
    }
    prevRef.current = pathname;
  }

  const dir = dirRef.current;
  const isMessages = pathname.startsWith("/client/messages");

  useWorkoutPrefetch(me?.id ?? "");

  const color = avatarColor(me?.full_name ?? "?");

  return (
    <div
      className="client-app"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "var(--c-bg)",
      }}
    >
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Status bar spacer ── */}
      <div style={{ height: "env(safe-area-inset-top, 0px)", background: "var(--c-surface)", flexShrink: 0 }} />
      {/* ── Top header ── */}
      <header
        style={{
          height: 64,
          paddingLeft: "20px",
          paddingRight: "20px",
          borderBottom: "1px solid var(--c-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "var(--c-surface)",
        }}
      >
        <div style={{ lineHeight: 1 }}>
          <Image src="/fs%20collab.png" alt="fs collab" width={140} height={44} className="logo-adaptive" style={{ objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--c-text-muted)", fontWeight: 500 }}>
            {me?.full_name?.split(" ")[0] ?? ""}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              boxShadow: `0 0 12px ${color}66`,
            }}
          >
            {initials(me?.full_name ?? null)}
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="icon-wiggle"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--c-surface2)",
                border: "1px solid var(--c-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--c-text-muted)",
                padding: 0,
              }}
              title="Kirjaudu ulos"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </form>
        </div>
      </header>

      {/* ── Offline / sync indicator ── */}
      <SyncBar />

      {/* ── Content ── */}
      <main
        key={pathname}
        style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", transform: "translateZ(0)", clipPath: "inset(0)" }}
      >
        <div
          className={dir}
          style={{ flex: 1, overflow: isMessages ? "hidden" : "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", width: "100%" }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: isMessages ? undefined : "100%", width: "100%" }}>
            {children}
          </div>
        </div>
      </main>

      {/* ── Bottom nav ── */}
      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--c-border)",
          background: "var(--c-surface)",
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 0 8px",
                textDecoration: "none",
                position: "relative",
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "30%",
                    width: "40%",
                    height: 2,
                    background: "var(--c-pink)",
                    borderRadius: "0 0 2px 2px",
                    boxShadow: "0 0 8px var(--c-pink-glow)",
                  }}
                />
              )}
              <Icon
                size={24}
                weight={active ? "fill" : "regular"}
                color={active ? "var(--c-pink)" : "rgba(240,238,245,0.65)"}
              />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: "0.2px", color: active ? "var(--c-pink)" : "rgba(240,238,245,0.4)" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
    </div>
  );
}
