import type React from "react";
import Link from "next/link";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { InviteClientButton } from "@/components/coach/invite-client-button";
import { SentInvitesButton } from "@/components/coach/sent-invites-button";
import { Calendar, CheckCircle2, UserRound } from "lucide-react";
import { avatarColor, nameInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data } = await supabase
    .from("coach_clients")
    .select("client_id, status, profiles:client_id(id, full_name, avatar_url, created_at)")
    .eq("coach_id", user.id);

  const rows = (data ?? []).filter((r: any) => r.profiles);

  const { data: invites } = await supabase
    .from("invitations")
    .select("id, email, invited_name, created_at")
    .eq("coach_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const clientIds = rows.map((r: any) => r.client_id as string);

  const [lastWorkoutsRes, pendingRes, bodyweightsRes] = clientIds.length > 0
    ? await Promise.all([
        supabase
          .from("scheduled_workouts")
          .select("client_id, completed_at, program_days(name)")
          .in("client_id", clientIds)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(clientIds.length * 3),
        supabase
          .from("scheduled_workouts")
          .select("client_id, program_days(name, program_weeks(is_active))")
          .in("client_id", clientIds)
          .eq("status", "pending"),
        supabase
          .from("bodyweights")
          .select("client_id, weight_kg, logged_at")
          .in("client_id", clientIds)
          .order("logged_at", { ascending: false })
          .limit(clientIds.length * 10),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];

  const lastByClient = new Map<string, any>();
  for (const w of lastWorkoutsRes.data ?? []) {
    if (!lastByClient.has((w as any).client_id)) lastByClient.set((w as any).client_id, w);
  }

  const pendingByClient = new Map<string, { count: number; next: any }>();
  for (const w of pendingRes.data ?? []) {
    if ((w as any).program_days?.program_weeks?.is_active !== true) continue;
    const cid = (w as any).client_id as string;
    const cur = pendingByClient.get(cid) ?? { count: 0, next: null };
    if (!cur.next) cur.next = w;
    cur.count++;
    pendingByClient.set(cid, cur);
  }

  const bwByClient = new Map<string, number>();
  for (const row of bodyweightsRes.data ?? []) {
    if (!bwByClient.has((row as any).client_id)) {
      bwByClient.set((row as any).client_id, (row as any).weight_kg as number);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="card-enter font-display text-2xl font-semibold">Asiakkaat</h1>
        <div className="card-enter card-enter-1 flex items-center gap-2">
          <SentInvitesButton invites={invites ?? []} />
          <InviteClientButton coachId={user.id} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card-enter card-enter-2 mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <UserRound className="h-12 w-12 opacity-20" />
          <p className="text-sm">Ei vielä linkitettyjä asiakkaita.</p>
          <p className="max-w-xs text-xs">Kutsu ensimmäinen asiakkaasi sähköpostilla — hän saa linkin, jolla tili yhdistyy sinuun.</p>
          <div className="mt-1"><InviteClientButton coachId={user.id} /></div>
        </div>
      ) : (
        <div className="card-enter card-enter-2 mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r: any) => {
            const profile = r.profiles;
            const name: string = profile.full_name ?? "Unnamed";
            const lastWorkout = lastByClient.get(r.client_id);
            const pendingEntry = pendingByClient.get(r.client_id);
            const pendingCount = pendingEntry?.count ?? 0;
            const pendingTone =
              pendingCount >= 4 ? "var(--coach-ok)" : pendingCount >= 2 ? "var(--coach-gold)" : "var(--coach-danger)";
            const pendingStyle: React.CSSProperties = {
              background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${pendingTone} 55%, white), ${pendingTone})`,
              boxShadow: `0 0 8px 3px color-mix(in srgb, ${pendingTone} 45%, transparent)`,
            };
            const initials = nameInitials(name);
            const gradient = avatarColor(name);
            const isActive = r.status === "active";
            const latestBw = bwByClient.get(r.client_id) ?? null;

            return (
              <Link
                key={r.client_id}
                href={`/coach/clients/${r.client_id}`}
                prefetch
                className="card-grow group relative overflow-hidden rounded-2xl border bg-card p-5 active:translate-y-0"
              >
                {/* pink gradient hover overlay */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(135deg, color-mix(in srgb, hsl(var(--primary)) 10%, transparent) 0%, color-mix(in srgb, hsl(var(--primary)) 4%, transparent) 100%)",
                  }}
                />

                <div className="relative flex items-start gap-4">
                  {/* Avatar */}
                  <div aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--coach-ok)_15%,transparent)] text-coach-ok"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isActive ? "Aktiivinen" : r.status === "pending" ? "Odottaa" : r.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Liittynyt {new Date(profile.created_at).toLocaleDateString("fi-FI")}
                      </p>
                      {latestBw != null && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {latestBw} kg
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workout summary */}
                <div className="relative mt-4 space-y-1.5 border-t pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-coach-ok" />
                    {lastWorkout ? (
                      <span>
                        Viimeksi{" "}
                        {lastWorkout.completed_at && (
                          <span className="text-foreground">
                            {new Date(lastWorkout.completed_at).toLocaleDateString("fi-FI", { weekday: "short", day: "numeric", month: "numeric" })}
                          </span>
                        )}
                        {(lastWorkout as any).program_days?.name
                          ? ` · ${(lastWorkout as any).program_days.name.replace(/^Day(\d+)/, "Päivä $1")}`
                          : ""}
                      </span>
                    ) : (
                      <span className="italic">Ei vielä suoritettuja treenejä</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-coach-info" />
                    {pendingEntry?.next ? (
                      <span>
                        Seuraava{" "}
                        <span className="text-foreground">
                          {(pendingEntry.next as any).program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni"}
                        </span>
                      </span>
                    ) : (
                      <span className="italic">Ei tulevia treenejä</span>
                    )}
                  </div>
                  {/* Remaining programmed workouts — red = needs new programming */}
                  <div className="flex items-center gap-2 text-xs">
                    <span aria-hidden className="ml-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={pendingStyle} />
                    <span style={{ color: pendingTone }}>
                      {pendingCount === 0
                        ? "Ei ohjelmoituja treenejä"
                        : `${pendingCount} treeniä jäljellä aktiivisella viikolla`}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
