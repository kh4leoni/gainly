"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getCoachFullDashboard } from "@/lib/queries/coach";
import { getMe } from "@/lib/queries/profile";
import { Users, Trophy, Dumbbell, MessageCircle } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#ec4899", "#f97316", "#eab308", "#22c55e",
  "#6366f1", "#8b5cf6", "#14b8a6", "#f43f5e",
  "#06b6d4", "#a855f7",
];

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length] ?? "#ec4899";
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const FI_DAYS_FULL = ["sunnuntai", "maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai"];


function lastWorkoutStatus(lastWorkout: string | null): { text: string; color: string } {
  if (!lastWorkout) return { text: "Ei treenannut", color: "#ef4444" };
  const then = new Date(lastWorkout);
  const today = new Date(); today.setHours(0, 0, 0, 0); then.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (days === 0) return { text: "Tänään ✓", color: "#22c55e" };
  if (days === 1) return { text: "Eilen", color: "#84cc16" };
  if (days <= 3) return { text: `${days}pv sitten`, color: "#eab308" };
  if (days <= 6) return { text: `${days}pv sitten`, color: "#f97316" };
  return { text: `${days}pv sitten`, color: "#ef4444" };
}

function barColor(pct: number): string {
  if (pct >= 80) return "#ec4899";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}

function formatWeight(w: number | null): string {
  if (w === null) return "—";
  return w % 1 === 0 ? `${w} kg` : `${w.toFixed(1)} kg`;
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0); date.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "tänään";
  if (diff === 1) return "eilen";
  return `${diff}pv sitten`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ClientAvatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const color = avatarColor(name ?? "?");
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
  dotColor,
  href,
  className,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub: string;
  dotColor: string;
  href?: string;
  className?: string;
}) {
  const card = (
    <div
      className={`stat-card card-grow relative overflow-hidden rounded-2xl border bg-card p-5${className ? ` ${className}` : ""}`}
      style={{ cursor: href ? "pointer" : undefined }}
      onMouseEnter={(e) => {
        if (href) {
          e.currentTarget.style.background = `linear-gradient(135deg, ${dotColor}22 0%, ${dotColor}0a 100%)`;
          e.currentTarget.style.borderColor = `${dotColor}55`;
        }
      }}
      onMouseLeave={(e) => {
        if (href) {
          e.currentTarget.style.background = "";
          e.currentTarget.style.borderColor = "";
        }
      }}
    >
      <span
        className="stat-dot absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <div className="mb-3 stat-icon" style={{ color: dotColor }}>{icon}</div>
      <div className="text-3xl font-bold leading-none" style={{ color: dotColor }}>
        {value}
      </div>
      <div className="mt-1.5 text-sm font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        {card}
      </Link>
    );
  }
  return card;
}

function SectionCard({
  title,
  badge,
  children,
  className,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card-grow flex flex-col overflow-hidden rounded-2xl border bg-card${className ? ` ${className}` : ""}`}
    >
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <span className="text-sm font-semibold">{title}</span>
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── main view ───────────────────────────────────────────────────────────────

export function CoachDashboardView() {
  const supabase = createClient();

  const { data: me } = useSuspenseQuery({
    queryKey: ["me"],
    queryFn: () => getMe(supabase),
    staleTime: Infinity, // data is hydrated from server — never re-fetch on client
  });

  const coachId = me?.id ?? "";

  const { data } = useSuspenseQuery({
    queryKey: ["coach", "full-dashboard", coachId],
    queryFn: () =>
      coachId ? getCoachFullDashboard(supabase, coachId) : Promise.resolve(null),
  });

  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pctRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const rafRefs = useRef<Map<string, number>>(new Map());

  const ANIM_MS = 950;
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.5);

  const animateBar = (clientId: string, pct: number) => {
    const bar = barRefs.current.get(clientId);
    if (bar) {
      bar.style.transition = "none";
      bar.style.width = "0%";
      bar.offsetWidth; // force reflow
      bar.style.transition = `width ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      bar.style.width = `${pct}%`;
    }

    const pctEl = pctRefs.current.get(clientId);
    if (pctEl) {
      const prev = rafRefs.current.get(clientId);
      if (prev) cancelAnimationFrame(prev);
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = Math.min(now - start, ANIM_MS);
        pctEl.textContent = `${Math.round(easeOut(elapsed / ANIM_MS) * pct)}%`;
        if (elapsed < ANIM_MS) {
          rafRefs.current.set(clientId, requestAnimationFrame(tick));
        } else {
          pctEl.textContent = `${pct}%`;
          rafRefs.current.delete(clientId);
        }
      };
      rafRefs.current.set(clientId, requestAnimationFrame(tick));
    }
  };

  const resetBar = (clientId: string, pct: number) => {
    const bar = barRefs.current.get(clientId);
    if (bar) {
      bar.style.transition = "none";
      bar.style.width = `${pct}%`;
    }
    const prev = rafRefs.current.get(clientId);
    if (prev) cancelAnimationFrame(prev);
    rafRefs.current.delete(clientId);
    const pctEl = pctRefs.current.get(clientId);
    if (pctEl) pctEl.textContent = `${pct}%`;
  };

  if (!data) return null;

  const now = new Date();
  const dayName = FI_DAYS_FULL[now.getDay()] ?? "";
  const dateLabel = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
  const firstName = me?.full_name?.split(" ")[0] ?? "Valmentaja";

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <h1 className="card-enter text-2xl font-bold">Dashboard</h1>
      <p className="card-enter card-enter-1 mt-0.5 text-sm text-muted-foreground">
        {dayName} {dateLabel} — Hei {firstName}! 👋
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users size={18} />}
          value={data.activeCount}
          label="Aktiiviset asiakkaat"
          sub={`/ ${data.totalCount} yhteensä`}
          dotColor="#ec4899"
          className="card-enter card-enter-2"
        />
        <StatCard
          icon={<Trophy size={18} />}
          value={data.prCount}
          label="Ennätyksiä rikottu"
          sub="tässä kuussa"
          dotColor="#f59e0b"
          className="card-enter card-enter-3"
        />
        <StatCard
          icon={<Dumbbell size={18} />}
          value={data.setCount}
          label="Sarjoja kirjattu"
          sub="viimeinen viikko"
          dotColor="#14b8a6"
          className="card-enter card-enter-4"
        />
        <StatCard
          icon={<MessageCircle size={18} />}
          value={data.unreadCount}
          label="Uusia viestejä"
          sub="vastaamatta"
          dotColor="#8b5cf6"
          href="/coach/messages"
          className="card-enter card-enter-5"
        />
      </div>

      {/* Row 2 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Tarvitsee huomiota */}
        <div className="lg:col-span-3">
          <SectionCard
            title="Tarvitsee huomiota"
            badge={
              data.attentionClients.length > 0
                ? `${data.attentionClients.length} asiakasta`
                : undefined
            }
            className="card-enter card-enter-6"
          >
            {data.attentionClients.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Kaikki asiakkaat ovat treenanneet tänään 🎉
              </div>
            ) : (
              <ul>
                {data.attentionClients.map((c) => {
                  const ws = lastWorkoutStatus(c.lastWorkout);
                  return (
                    <li key={c.client_id}>
                      <Link
                        href={`/coach/clients/${c.client_id}`}
                        className="flex items-center gap-3 border-b px-5 py-3.5 last:border-0 transition-colors hover:bg-accent/40"
                      >
                        <ClientAvatar name={c.full_name} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.full_name ?? "—"}</div>
                          {c.program && (
                            <div className="truncate text-xs text-muted-foreground">{c.program}</div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ws.color }}
                          />
                          <span className="text-xs" style={{ color: ws.color }}>
                            {ws.text}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Tuoreimmat ennätykset */}
        <div className="lg:col-span-2">
          <SectionCard title="Tuoreimmat ennätykset" className="card-enter card-enter-7">
            {data.recentPRs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Ei ennätyksiä vielä.
              </div>
            ) : (
              <ul>
                {data.recentPRs.map((pr) => (
                  <li
                    key={pr.id}
                    className="flex items-center gap-3 border-b px-5 py-3.5 last:border-0"
                  >
                    <ClientAvatar name={pr.client_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {pr.exercise_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pr.client_name ?? "—"} · {relativeDate(pr.achieved_at)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold" style={{ color: "#ec4899" }}>
                        {pr.weight != null ? formatWeight(pr.weight) : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">UUSI ENNÄTYS</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Row 3 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Noudatusprosentit */}
        <div className="lg:col-span-3">
          <SectionCard title="Noudatusprosentit" className="card-enter card-enter-8">
            {data.compliance.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Ei aikataulutettuja treenejä viimeisen 4 viikon aikana.
              </div>
            ) : (
              <div className="divide-y">
                {data.compliance.map((c) => (
                  <div
                    key={c.clientId}
                    className="flex items-center gap-3 px-5 py-3.5"
                    onMouseEnter={() => animateBar(c.clientId, c.pct)}
                    onMouseLeave={() => resetBar(c.clientId, c.pct)}
                  >
                    <ClientAvatar name={c.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {c.name.split(" ")[0] ?? c.name}
                        </span>
                        <span
                          ref={(el) => {
                            if (el) pctRefs.current.set(c.clientId, el);
                            else pctRefs.current.delete(c.clientId);
                          }}
                          className="shrink-0 text-sm font-bold"
                          style={{ color: barColor(c.pct) }}
                        >
                          {c.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          ref={(el) => {
                            if (el) barRefs.current.set(c.clientId, el);
                            else barRefs.current.delete(c.clientId);
                          }}
                          className="h-full rounded-full"
                          style={{
                            width: `${c.pct}%`,
                            backgroundColor: barColor(c.pct),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Aktiivinen viikko — odottavat treenit */}
        <div className="lg:col-span-2">
          <SectionCard title="Aktiivinen viikko" className="card-enter card-enter-9">
            {data.upcomingWorkouts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Ei odottavia treenejä aktiivisella viikolla.
              </div>
            ) : (
              <ul>
                {data.upcomingWorkouts.map((w) => {
                  const dotC = avatarColor(w.client_name ?? w.client_id);
                  return (
                    <li
                      key={w.id}
                      className="flex items-center gap-3 border-b px-5 py-3.5 last:border-0"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dotC }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {w.client_name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">Odottaa</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
