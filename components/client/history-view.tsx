"use client";

import { useMemo, useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getPastWorkouts, type PastWorkout } from "@/lib/queries/workouts";
import Link from "next/link";
import { SyncBadge } from "@/components/offline/sync-badge";
import { useLocalCompletedNotInServer, useUnsyncedForWorkout } from "@/lib/offline/reads";
import { stripCopySuffix } from "@/lib/utils";
import { StatusPill, STATUS } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/empty-state";
import { Barbell } from "@phosphor-icons/react";
import { Subtitle, SectionLabel } from "@/components/ui/typography";

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

function SetRow({
  weight, reps, rpe, isPr, leadLabel, leadWidth = 50,
}: {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isPr: boolean;
  leadLabel: string;
  leadWidth?: number;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, fontSize: 13,
      background: isPr ? STATUS.pr.bg : "transparent",
      borderRadius: "var(--r-xs)",
      padding: "4px 8px",
      borderLeft: isPr ? `3px solid ${STATUS.pr.fg}` : "3px solid transparent",
    }}>
      <span style={{ width: leadWidth, color: "var(--c-text-subtle)", fontSize: 11, flexShrink: 0 }}>
        {leadLabel}
      </span>
      <span style={{ fontWeight: 600, color: "var(--c-text)" }}>
        {weight ?? 0} kg × {reps ?? 0}
      </span>
      {rpe != null && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--r-xl)",
          background: "color-mix(in srgb, var(--c-pink) 10%, transparent)", color: "var(--c-pink)",
          border: "1px solid color-mix(in srgb, var(--c-pink) 20%, transparent)",
        }}>
          RPE {rpe}
        </span>
      )}
      {isPr && <StatusPill kind="pr" compact />}
    </div>
  );
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
      borderRadius: "var(--r-md)",
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
            <StatusPill kind="done" compact />
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
              background: "color-mix(in srgb, var(--c-pink) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--c-pink) 18%, transparent)",
              borderRadius: "var(--r-md)", padding: "8px 12px", marginBottom: 12,
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {sets.map((s, i) => (
                      <SetRow
                        key={i}
                        weight={s.weight}
                        reps={s.reps}
                        rpe={s.rpe}
                        isPr={s.is_pr}
                        leadLabel={`Sarja ${s.set_number ?? i + 1}`}
                      />
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
              padding: "9px 16px", borderRadius: "var(--r-md)",
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
      borderRadius: "var(--r-lg)",
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <StatusPill kind="done" compact />
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
      borderRadius: "var(--r-lg)",
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
            padding: "3px 8px", borderRadius: "var(--r-xl)",
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

type SearchHit = {
  workoutId: string;
  dateMs: number;
  dateLabel: string;
  setNumber: number | null;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isPr: boolean;
};

function buildSearchGroups(workouts: PastWorkout[], q: string): Array<{ name: string; hits: SearchHit[] }> {
  const ql = q.trim().toLowerCase();
  if (!ql) return [];
  const byEx = new Map<string, SearchHit[]>();
  for (const w of workouts) {
    const dateMs = w.completed_at ? new Date(w.completed_at).getTime() : 0;
    const dateLabel = w.completed_at
      ? new Date(w.completed_at).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })
      : "—";
    const wl = pickRichestLog(w.workout_logs ?? []);
    for (const s of wl?.set_logs ?? []) {
      const name = s.exercises?.name ?? "";
      if (!name.toLowerCase().includes(ql)) continue;
      let arr = byEx.get(name);
      if (!arr) { arr = []; byEx.set(name, arr); }
      arr.push({
        workoutId: w.id,
        dateMs,
        dateLabel,
        setNumber: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        isPr: s.is_pr,
      });
    }
  }
  const groups = Array.from(byEx.entries()).map(([name, hits]) => {
    hits.sort((a, b) => b.dateMs - a.dateMs);
    return { name, hits };
  });
  groups.sort((a, b) => b.hits.length - a.hits.length);
  return groups;
}

export function HistoryView({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const [query, setQuery] = useState("");

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["past-workouts", clientId],
    queryFn: () => getPastWorkouts(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const serverIds = workouts.map((w) => w.id);
  const localOnly = useLocalCompletedNotInServer(clientId, serverIds);

  const { programs, orphans } = useMemo(() => buildHierarchy(workouts), [workouts]);
  const searching = query.trim().length > 0;
  const searchGroups = useMemo(() => buildSearchGroups(workouts, query), [workouts, query]);

  return (
    <div style={{ flex: 1 }}>
      <div style={{ padding: "8px 16px 32px" }}>
      <Subtitle style={{ marginBottom: 16 }}>Tehdyt treenit</Subtitle>

      <div style={{ position: "relative", marginBottom: 20 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hae liikenimellä, esim. squat"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 36px 10px 14px",
            borderRadius: "var(--r-md)",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text)",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Tyhjennä haku"
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--c-text-muted)", fontSize: 18, padding: 4, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: "var(--r-lg)", background: "var(--c-surface)", opacity: 0.4 }} />
          ))}
        </div>
      )}

      {!isLoading && workouts.length === 0 && localOnly.length === 0 && (
        <EmptyState
          icon={Barbell}
          title="Ei vielä treenejä"
          description="Tehdyt treenit kertyvät tänne automaattisesti."
        />
      )}

      {!searching && localOnly.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel style={{ marginBottom: 10 }}>Odottaa synkronointia</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {localOnly.map((s) => <LocalOnlyCard key={s.id} completedAt={s.completed_at} />)}
          </div>
        </div>
      )}

      {searching && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {searchGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-text-muted)", fontSize: 13 }}>
              Ei osumia haulle &ldquo;{query}&rdquo;.
            </div>
          ) : (
            searchGroups.map(({ name, hits }) => (
              <div key={name} style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-md)",
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{name}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "var(--c-text-muted)",
                    background: "var(--c-surface2)", border: "1px solid var(--c-border)",
                    padding: "2px 7px", borderRadius: "var(--r-xl)",
                  }}>
                    {hits.length} sarjaa
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {hits.map((h, i) => (
                    <Link
                      key={i}
                      href={`/client/workout/${h.workoutId}`}
                      style={{ textDecoration: "none" }}
                    >
                      <SetRow
                        weight={h.weight}
                        reps={h.reps}
                        rpe={h.rpe}
                        isPr={h.isPr}
                        leadLabel={h.dateLabel}
                        leadWidth={78}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!searching && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                title={stripCopySuffix(bg.name) || `Jakso ${bg.blockNumber}`}
                subtitle={`${bg.weeks.length} viikkoa`}
                count={bg.workoutCount}
                defaultOpen={pi === 0 && bi === 0}
              >
                {bg.weeks.map((wg, wi) => (
                  <CollapseSection
                    key={wg.id}
                    title={stripCopySuffix(wg.name) || `Viikko ${wg.weekNumber}`}
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
      </div>}
      </div>
    </div>
  );
}
