"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getCoachFullDashboard } from "@/lib/queries/coach";
import { getMe } from "@/lib/queries/profile";
import { Users, Trophy, Dumbbell, MessageCircle } from "lucide-react";
import { roundKg } from "@/lib/calc/one-rm";

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
const FI_DAYS_SHORT = ["su", "ma", "ti", "ke", "to", "pe", "la"];

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(y, m - 1, d);
  return `${FI_DAYS_SHORT[date.getDay()] ?? ""} ${d}.${m}.`;
}

function daysUntilLabel(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const target = new Date(parts[0] ?? 2000, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "tänään";
  if (diff === 1) return "huomenna";
  return `${diff}pv`;
}

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
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub: string;
  dotColor: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-lg"
      style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <span
        className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <div className="mb-3" style={{ color: dotColor }}>{icon}</div>
      <div className="text-3xl font-bold leading-none" style={{ color: dotColor }}>
        {value}
      </div>
      <div className="mt-1.5 text-sm font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
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

  if (!data) return null;

  const now = new Date();
  const dayName = FI_DAYS_FULL[now.getDay()] ?? "";
  const dateLabel = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
  const firstName = me?.full_name?.split(" ")[0] ?? "Valmentaja";

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
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
        />
        <StatCard
          icon={<Trophy size={18} />}
          value={data.prCount}
          label="Ennätyksiä rikottu"
          sub="tässä kuussa"
          dotColor="#f59e0b"
        />
        <StatCard
          icon={<Dumbbell size={18} />}
          value={data.setCount}
          label="Sarjoja kirjattu"
          sub="viimeinen viikko"
          dotColor="#14b8a6"
        />
        <StatCard
          icon={<MessageCircle size={18} />}
          value={data.unreadCount}
          label="Uusia viestejä"
          sub="vastaamatta"
          dotColor="#8b5cf6"
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
          <SectionCard title="Tuoreimmat ennätykset">
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
                        {pr.exercise_name ?? "—"}{" "}
                        <span className="text-xs text-muted-foreground">(1RM)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pr.client_name ?? "—"} · {relativeDate(pr.achieved_at)}
                        {pr.weight != null && pr.reps != null && (
                          <span className="ml-1">· {pr.weight}kg × {pr.reps}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold" style={{ color: "#ec4899" }}>
                        {formatWeight(pr.estimated_1rm != null ? roundKg(pr.estimated_1rm) : null)}
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
          <SectionCard title="Noudatusprosentit">
            {data.compliance.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Ei aikataulutettuja treenejä viimeisen 4 viikon aikana.
              </div>
            ) : (
              <div className="divide-y">
                {data.compliance.map((c) => (
                  <div key={c.clientId} className="flex items-center gap-3 px-5 py-3.5">
                    <ClientAvatar name={c.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {c.name.split(" ")[0] ?? c.name}
                        </span>
                        <span
                          className="shrink-0 text-sm font-bold"
                          style={{ color: barColor(c.pct) }}
                        >
                          {c.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${c.pct}%`,
                            backgroundColor: barColor(c.pct),
                            transition: "width 600ms ease",
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

        {/* Tulevan viikon treenit */}
        <div className="lg:col-span-2">
          <SectionCard title="Tulevan viikon treenit">
            {data.upcomingWorkouts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Ei aikataulutettuja treenejä.
              </div>
            ) : (
              <ul>
                {data.upcomingWorkouts.map((w) => {
                  const dotC =
                    w.status === "completed"
                      ? "#22c55e"
                      : avatarColor(w.client_name ?? w.client_id);
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
                        <div className="text-xs text-muted-foreground">
                          {formatShortDate(w.scheduled_date)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {daysUntilLabel(w.scheduled_date)}
                      </span>
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
