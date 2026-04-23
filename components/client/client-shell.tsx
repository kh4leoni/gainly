"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: ReactNode };
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

export function ClientShell({ me, nav, children }: { me: Me; nav: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
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
      }}
    >
      {/* ── Top header ── */}
      <header
        style={{
          paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
          paddingBottom: "12px",
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
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text-muted)" }}>Gainly × </span>
          <span
            style={{
              fontFamily: "var(--font-dancing)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--c-pink)",
            }}
          >
            Fanni Savela
          </span>
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

      {/* ── Content ── */}
      <main
        className="c-ani"
        key={pathname}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column" }}
      >
        {children}
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
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 0 8px",
                textDecoration: "none",
                color: active ? "var(--c-pink)" : "var(--c-text-subtle)",
                position: "relative",
                transition: "color 0.15s",
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
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: "0.2px" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
    </div>
  );
}
