"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getPastWorkouts, type PastWorkout } from "@/lib/queries/workouts";
import Link from "next/link";
import { SyncBar } from "@/components/offline/sync-bar";
import { SyncBadge } from "@/components/offline/sync-badge";
import { useLocalCompletedNotInServer, useUnsyncedForWorkout } from "@/lib/offline/reads";

function groupByWeek(workouts: PastWorkout[]): Array<{ label: string; workouts: PastWorkout[] }> {
  const map = new Map<string, PastWorkout[]>();
  for (const w of workouts) {
    const ts = w.completed_at ?? "";
    const d = ts ? new Date(ts) : new Date(0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  }
  return Array.from(map.entries()).map(([key, ws]) => {
    const start = new Date(key);
    const end = new Date(key);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric" };
    const label = `${start.toLocaleDateString("fi-FI", opts)}–${end.toLocaleDateString("fi-FI", opts)}`;
    return { label, workouts: ws };
  });
}

function groupSetsByExercise(sets: PastWorkout["workout_logs"][number]["set_logs"]) {
  const order: string[] = [];
  const map = new Map<string, typeof sets>();
  for (const s of [...sets].sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))) {
    const name = s.exercises?.name ?? "—";
    if (!map.has(name)) { map.set(name, []); order.push(name); }
    map.get(name)!.push(s);
  }
  return order.map((name) => ({ name, sets: map.get(name)! }));
}

function pickRichestLog(logs: PastWorkout["workout_logs"]): PastWorkout["workout_logs"][number] | null {
  if (!logs || logs.length === 0) return null;
  let best = logs[0]!;
  for (const l of logs) {
    if ((l.set_logs?.length ?? 0) > (best.set_logs?.length ?? 0)) best = l;
  }
  return best;
}

function WorkoutCard({ w }: { w: PastWorkout }) {
  const [open, setOpen] = useState(false);
  const wl = pickRichestLog(w.workout_logs ?? []);
  const serverSets = wl?.set_logs ?? [];
  const grouped = groupSetsByExercise(serverSets);
  const exNames = (w.program_days?.program_exercises ?? [])
    .slice().sort((a, b) => a.order_idx - b.order_idx)
    .map((pe) => pe.exercises?.name).filter(Boolean);
  const unsynced = useUnsyncedForWorkout(w.id);

  const dateStr = w.completed_at
    ? new Date(w.completed_at).toLocaleDateString("fi-FI", { weekday: "short", day: "numeric", month: "numeric" })
    : "";

  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "14px 16px",
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "var(--c-green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              ✓ Tehty
            </span>
            <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{dateStr}</span>
            <SyncBadge synced={!unsynced} size={11} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", marginBottom: 3 }}>
            {w.program_days?.name ?? "Treeni"}
          </div>
          {exNames.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(exNames as string[]).join(" · ")}
            </div>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-muted)" strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--c-border)", padding: "12px 16px 14px" }}>
          {wl?.notes && (
            <div style={{
              background: "rgba(255,29,140,0.07)", border: "1px solid rgba(255,29,140,0.18)",
              borderRadius: 10, padding: "8px 12px", marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, color: "var(--c-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>
                Muistiinpano
              </div>
              <div style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.5 }}>{wl.notes}</div>
            </div>
          )}

          {grouped.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {grouped.map(({ name, sets }) => (
                <div key={name}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                    {name}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {sets.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <span style={{ width: 50, color: "var(--c-text-subtle)", fontSize: 11 }}>
                          Sarja {s.set_number ?? i + 1}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--c-text)" }}>
                          {s.weight ?? 0} kg × {s.reps ?? 0}
                        </span>
                        {s.rpe != null && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                            background: "rgba(255,29,140,0.1)", color: "var(--c-pink)",
                            border: "1px solid rgba(255,29,140,0.2)",
                          }}>
                            RPE {s.rpe}
                          </span>
                        )}
                        {s.is_pr && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                            background: "rgba(245,166,35,0.12)", color: "#F5A623",
                            border: "1px solid rgba(245,166,35,0.25)",
                          }}>
                            PR
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--c-text-muted)" }}>Ei kirjattuja sarjoja.</p>
          )}

          <Link
            href={`/client/workout/${w.id}`}
            style={{
              display: "block", marginTop: 14, textAlign: "center",
              padding: "9px 16px", borderRadius: 10,
              background: "var(--c-surface2)", border: "1px solid var(--c-border)",
              fontSize: 13, fontWeight: 600, color: "var(--c-text-muted)",
              textDecoration: "none",
            }}
          >
            Avaa treeni
          </Link>
        </div>
      )}
    </div>
  );
}

function LocalOnlyCard({ completedAt }: { completedAt: string | null }) {
  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString("fi-FI", { weekday: "short", day: "numeric", month: "numeric" })
    : "";
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px dashed var(--c-border)",
      borderRadius: 16,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--c-green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          ✓ Tehty
        </span>
        <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{dateStr}</span>
        <SyncBadge synced={false} size={11} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>Treeni</div>
      <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
        Odottaa synkronointia — näkyy täydellisenä, kun yhteys palaa.
      </div>
    </div>
  );
}

export function HistoryView({ clientId }: { clientId: string }) {
  const supabase = createClient();

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["past-workouts", clientId],
    queryFn: () => getPastWorkouts(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const serverIds = workouts.map((w) => w.id);
  const localOnly = useLocalCompletedNotInServer(clientId, serverIds);

  const weeks = groupByWeek(workouts);

  return (
    <div style={{ flex: 1 }}>
      <SyncBar />
      <div style={{ padding: "24px 16px 32px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Historia</div>
      <div style={{ fontSize: 13, color: "var(--c-text-muted)", marginBottom: 24 }}>
        Tehdyt treenit
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 16, background: "var(--c-surface)", opacity: 0.4 }} />
          ))}
        </div>
      )}

      {!isLoading && workouts.length === 0 && localOnly.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏋️</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Ei vielä treenejä</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Treenaaminen tallentuu tänne.</div>
        </div>
      )}

      {localOnly.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            Odottaa synkronointia
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {localOnly.map((s) => <LocalOnlyCard key={s.id} completedAt={s.completed_at} />)}
          </div>
        </div>
      )}

      {weeks.map(({ label, workouts: wws }) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {wws.map((w) => <WorkoutCard key={w.id} w={w} />)}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
