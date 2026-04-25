import type React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InviteClientButton } from "@/components/coach/invite-client-button";
import { Calendar, CheckCircle2, UserRound } from "lucide-react";
import { avatarColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data } = await supabase
    .from("coach_clients")
    .select("client_id, status, profiles:client_id(id, full_name, avatar_url, created_at)")
    .eq("coach_id", user.user.id);

  const rows = (data ?? []).filter((r: any) => r.profiles);

  // Fetch last completed + next pending workout (active week) for each client in parallel
  const extras = await Promise.all(
    rows.map(async (r: any) => {
      const clientId: string = r.client_id;
      const [lastRes, allPendingRes] = await Promise.all([
        supabase
          .from("scheduled_workouts")
          .select("completed_at, program_days(name)")
          .eq("client_id", clientId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("scheduled_workouts")
          .select("program_days(name, program_weeks(is_active))")
          .eq("client_id", clientId)
          .eq("status", "pending"),
      ]);
      const activeWeekPending = (allPendingRes.data ?? []).filter(
        (w: any) => w.program_days?.program_weeks?.is_active === true
      );
      const nextWorkout = activeWeekPending[0] ?? null;
      return { clientId, last: lastRes.data, next: nextWorkout, pendingCount: activeWeekPending.length };
    })
  );

  const extraMap = new Map(extras.map((e) => [e.clientId, e]));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Asiakkaat</h1>
        <InviteClientButton coachId={user.user.id} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <UserRound className="h-12 w-12 opacity-20" />
          <p className="text-sm">Ei vielä linkitettyjä asiakkaita.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r: any) => {
            const profile = r.profiles;
            const name: string = profile.full_name ?? "Unnamed";
            const extra = extraMap.get(r.client_id);
            const pendingCount = extra?.pendingCount ?? 0;
            const pendingStyle: React.CSSProperties =
              pendingCount >= 4
                ? { background: "radial-gradient(circle at 35% 35%, #34d399, #059669)", boxShadow: "0 0 8px 3px rgba(16,185,129,0.45)" }
                : pendingCount >= 2
                ? { background: "radial-gradient(circle at 35% 35%, #fcd34d, #d97706)", boxShadow: "0 0 8px 3px rgba(251,191,36,0.45)" }
                : { background: "radial-gradient(circle at 35% 35%, #fb7185, #e11d48)", boxShadow: "0 0 8px 3px rgba(244,63,94,0.45)" };
            const initials = name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
            const gradient = avatarColor(name);
            const isActive = r.status === "active";

            return (
              <Link
                key={r.client_id}
                href={`/coach/clients/${r.client_id}`}
                prefetch
                className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-280 hover:scale-[1.025] hover:shadow-md active:scale-[0.99]"
                style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}
              >
                {/* pink gradient hover overlay */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgba(251,207,232,0.05) 100%)",
                    transition: "opacity 280ms cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />

                <div className="relative flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isActive ? "Aktiivinen" : r.status === "pending" ? "Odottaa" : r.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Liittynyt {new Date(profile.created_at).toLocaleDateString("fi-FI")}
                    </p>
                  </div>
                </div>

                {/* Pending workouts indicator */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tila</span>
                  <span className="h-3.5 w-3.5 rounded-full" style={pendingStyle} />
                </div>

                {/* Workout summary */}
                <div className="relative mt-4 space-y-1.5 border-t pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {extra?.last ? (
                      <span>
                        Viimeksi{" "}
                        {(extra.last as any).completed_at && (
                          <span className="text-foreground">
                            {new Date((extra.last as any).completed_at).toLocaleDateString("fi-FI", { weekday: "short", day: "numeric", month: "numeric" })}
                          </span>
                        )}
                        {(extra.last as any).program_days?.name
                          ? ` · ${(extra.last as any).program_days.name.replace(/^Day(\d+)/, "Päivä $1")}`
                          : ""}
                      </span>
                    ) : (
                      <span className="italic">Ei vielä suoritettuja treenejä</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                    {extra?.next ? (
                      <span>
                        Seuraava{" "}
                        <span className="text-foreground">
                          {(extra.next as any).program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni"}
                        </span>
                      </span>
                    ) : (
                      <span className="italic">Ei tulevia treenejä</span>
                    )}
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
