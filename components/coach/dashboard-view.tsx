"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getCoachFullDashboard } from "@/lib/queries/coach";
import { getMe } from "@/lib/queries/profile";
import { Users, Trophy, Dumbbell, MessageCircle } from "lucide-react";
import { avatarHex, nameInitials } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

const FI_DAYS_FULL = ["sunnuntai", "maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai"];


function lastWorkoutStatus(lastWorkout: string | null): { text: string; color: string } {
  if (!lastWorkout) return { text: "Ei treenannut", color: "var(--coach-danger)" };
  const then = new Date(lastWorkout);
  const today = new Date(); today.setHours(0, 0, 0, 0); then.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (days === 0) return { text: "Tänään ✓", color: "var(--coach-ok)" };
  if (days === 1) return { text: "Eilen", color: "var(--coach-lime)" };
  if (days <= 3) return { text: `${days}pv sitten`, color: "var(--coach-warn)" };
  if (days <= 6) return { text: `${days}pv sitten`, color: "var(--coach-hot)" };
  return { text: `${days}pv sitten`, color: "var(--coach-danger)" };
}

function barColor(pct: number): string {
  if (pct >= 80) return "hsl(var(--primary))";
  if (pct >= 60) return "var(--coach-gold)";
  return "var(--coach-danger)";
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
  const color = avatarHex(name);
  return (
    <div
      aria-hidden
      className="shrink-0 flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.36) }}
    >
      {nameInitials(name)}
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
      className={`stat-card card-grow${href ? " stat-card-link" : ""} relative overflow-hidden rounded-2xl border bg-card p-5${className ? ` ${className}` : ""}`}
      style={href ? ({ "--dot": dotColor } as React.CSSProperties) : undefined}
    >
      <span
        aria-hidden
        className="stat-dot absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <div className="mb-3 stat-icon" style={{ color: dotColor }}>{icon}</div>
      <div className="font-display text-3xl font-bold leading-none" style={{ color: dotColor }}>
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
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
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
      <h1 className="card-enter font-display text-2xl font-bold">Etusivu</h1>
      <p className="card-enter card-enter-1 mt-0.5 text-sm text-muted-foreground">
        {dayName} {dateLabel} — Hei {firstName}.
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users size={18} />}
          value={data.activeCount}
          label="Aktiiviset asiakkaat"
          sub={`/ ${data.totalCount} yhteensä`}
          dotColor="hsl(var(--primary))"
          className="card-enter card-enter-2"
        />
        <StatCard
          icon={<Trophy size={18} />}
          value={data.prCount}
          label="Ennätyksiä rikottu"
          sub="tässä kuussa"
          dotColor="var(--coach-gold)"
          className="card-enter card-enter-3"
        />
        <StatCard
          icon={<Dumbbell size={18} />}
          value={data.setCount}
          label="Sarjoja kirjattu"
          sub="viimeinen viikko"
          dotColor="var(--coach-teal)"
          className="card-enter card-enter-4"
        />
        <StatCard
          icon={<MessageCircle size={18} />}
          value={data.unreadCount}
          label="Uusia viestejä"
          sub="lukemattomia"
          dotColor="var(--coach-violet)"
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
                Kaikki asiakkaat ovat treenanneet tänään.
              </div>
            ) : (
              <ul>
                {data.attentionClients.map((c) => {
                  const ws = lastWorkoutStatus(c.lastWorkout);
                  return (
                    <li key={c.client_id} className="flex items-center border-b last:border-0 transition-colors hover:bg-accent/40">
                      <Link
                        href={`/coach/clients/${c.client_id}`}
                        className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-5"
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
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ws.color }}
                          />
                          <span className="text-xs" style={{ color: ws.color }}>
                            {ws.text}
                          </span>
                        </div>
                      </Link>
                      <Link
                        href={`/coach/messages?with=${c.client_id}`}
                        title={`Lähetä viesti: ${c.full_name ?? ""}`}
                        aria-label={`Lähetä viesti: ${c.full_name ?? ""}`}
                        className="mx-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <MessageCircle size={15} />
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
                      <div className="text-sm font-bold text-primary">
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
                  <Link
                    key={c.clientId}
                    href={`/coach/clients/${c.clientId}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40"
                  >
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
                      <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="bar-fill h-full rounded-full"
                          style={{
                            width: `${c.pct}%`,
                            backgroundColor: barColor(c.pct),
                          }}
                        />
                      </div>
                    </div>
                  </Link>
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
                  const dotC = avatarHex(w.client_name ?? w.client_id);
                  return (
                    <li key={w.id} className="border-b last:border-0">
                      <Link
                        href={`/coach/clients/${w.client_id}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40"
                      >
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dotC }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {w.client_name ?? "—"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {w.day_name
                              ? w.day_name.replace(/^Day(\d+)/, "Päivä $1")
                              : "Odottaa"}
                          </div>
                        </div>
                      </Link>
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
