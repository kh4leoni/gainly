"use client";

import { useMemo, useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getPastWorkouts, type PastWorkout } from "@/lib/queries/workouts";
import Link from "next/link";
import { SyncBadge } from "@/components/offline/sync-badge";
import { useLocalCompletedNotInServer, useUnsyncedForWorkout } from "@/lib/offline/reads";

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
    ? new Date(w.completed_at).toLocaleDateString("fi-FI", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" })
    : "";

  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "12px 14px",
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: "var(--c-green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              ✓ Tehty
            </span>
            <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{dateStr}</span>
            <SyncBadge synced={!unsynced} size={11} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", marginBottom: 2 }}>
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

      <Collapse open={open}>
        <div style={{ borderTop: "1px solid var(--c-border)", padding: "12px 14px 14px" }}>
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
      </Collapse>
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

// ── Hierarchical grouping: Program → Block → Week → Workouts ──────────────────
type WeekGroup = {
  id: string;
  weekNumber: number;
  name: string | null;
  workouts: PastWorkout[];
};
type BlockGroup = {
  id: string;
  blockNumber: number;
  name: string | null;
  weeks: WeekGroup[];
  workoutCount: number;
};
type ProgramGroup = {
  id: string;
  title: string;
  blocks: BlockGroup[];
  workoutCount: number;
  latestAt: number;
};

function buildHierarchy(workouts: PastWorkout[]): { programs: ProgramGroup[]; orphans: PastWorkout[] } {
  const orphans: PastWorkout[] = [];
  const progMap = new Map<string, ProgramGroup>();

  for (const w of workouts) {
    const week = w.program_days?.program_weeks;
    const block = week?.program_blocks;
    const prog = block?.programs;
    if (!week || !block || !prog) {
      orphans.push(w);
      continue;
    }
    let pg = progMap.get(prog.id);
    if (!pg) {
      pg = { id: prog.id, title: prog.title, blocks: [], workoutCount: 0, latestAt: 0 };
      progMap.set(prog.id, pg);
    }
    let bg = pg.blocks.find((b) => b.id === block.id);
    if (!bg) {
      bg = { id: block.id, blockNumber: block.block_number, name: block.name, weeks: [], workoutCount: 0 };
      pg.blocks.push(bg);
    }
    let wg = bg.weeks.find((x) => x.id === week.id);
    if (!wg) {
      wg = { id: week.id, weekNumber: week.week_number, name: week.name, workouts: [] };
      bg.weeks.push(wg);
    }
    wg.workouts.push(w);
    bg.workoutCount += 1;
    pg.workoutCount += 1;
    const t = w.completed_at ? new Date(w.completed_at).getTime() : 0;
    if (t > pg.latestAt) pg.latestAt = t;
  }

  for (const pg of progMap.values()) {
    pg.blocks.sort((a, b) => b.blockNumber - a.blockNumber);
    for (const bg of pg.blocks) {
      bg.weeks.sort((a, b) => b.weekNumber - a.weekNumber);
      for (const wg of bg.weeks) {
        wg.workouts.sort((a, b) => {
          const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          return tb - ta;
        });
      }
    }
  }
  const programs = Array.from(progMap.values()).sort((a, b) => b.latestAt - a.latestAt);
  return { programs, orphans };
}

function CollapseSection({
  title, subtitle, count, defaultOpen, accent, children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  defaultOpen?: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "12px 14px",
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
          {accent && (
            <span style={{ width: 4, height: 28, borderRadius: 2, background: accent, flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)",
            background: "var(--c-surface2)", border: "1px solid var(--c-border)",
            padding: "3px 8px", borderRadius: 20,
          }}>
            {count}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-muted)" strokeWidth="2" strokeLinecap="round"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>
      <Collapse open={open}>
        <div style={{ borderTop: "1px solid var(--c-border)", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      </Collapse>
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

  const { programs, orphans } = useMemo(() => buildHierarchy(workouts), [workouts]);

  return (
    <div style={{ flex: 1 }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {programs.map((pg, pi) => (
          <CollapseSection
            key={pg.id}
            title={pg.title}
            subtitle={`${pg.blocks.length} jaksoa`}
            count={pg.workoutCount}
            defaultOpen={pi === 0}
            accent="var(--c-pink)"
          >
            {pg.blocks.map((bg, bi) => (
              <CollapseSection
                key={bg.id}
                title={bg.name?.trim() || `Jakso ${bg.blockNumber}`}
                subtitle={`${bg.weeks.length} viikkoa`}
                count={bg.workoutCount}
                defaultOpen={pi === 0 && bi === 0}
              >
                {bg.weeks.map((wg, wi) => (
                  <CollapseSection
                    key={wg.id}
                    title={wg.name?.trim() || `Viikko ${wg.weekNumber}`}
                    count={wg.workouts.length}
                    defaultOpen={pi === 0 && bi === 0 && wi === 0}
                  >
                    {wg.workouts.map((w) => <WorkoutCard key={w.id} w={w} />)}
                  </CollapseSection>
                ))}
              </CollapseSection>
            ))}
          </CollapseSection>
        ))}

        {orphans.length > 0 && (
          <CollapseSection title="Muut treenit" count={orphans.length} subtitle="Ohjelmasta poistetut">
            {orphans.map((w) => <WorkoutCard key={w.id} w={w} />)}
          </CollapseSection>
        )}
      </div>
      </div>
    </div>
  );
}
