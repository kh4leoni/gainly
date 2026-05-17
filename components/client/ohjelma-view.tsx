"use client";

import { useMemo, useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getClientSchedule, type ScheduleDay } from "@/lib/queries/workouts";
import { ExerciseInfoDialog } from "@/components/client/exercise-info-dialog";

type WeekGroup = {
  weekId: string;
  weekNumber: number;
  name: string | null;
  description: string | null;
  isActive: boolean;
  days: ScheduleDay[];
};
type BlockGroup = {
  blockId: string;
  blockNumber: number;
  name: string | null;
  weeks: WeekGroup[];
  hasActiveWeek: boolean;
  workoutCount: number;
};

function buildHierarchy(workouts: ScheduleDay[]): { blocks: BlockGroup[]; orphans: ScheduleDay[] } {
  const orphans: ScheduleDay[] = [];
  const blockMap = new Map<string, BlockGroup>();

  for (const w of workouts) {
    const week = w.program_days?.program_weeks;
    const block = week?.program_blocks;
    if (!week) {
      orphans.push(w);
      continue;
    }
    // Synthesize a "no block" group if a week exists without a block (legacy data)
    const blockId = block?.id ?? `__noblock_${week.id}`;
    let bg = blockMap.get(blockId);
    if (!bg) {
      bg = {
        blockId,
        blockNumber: block?.block_number ?? 0,
        name: block?.name ?? null,
        weeks: [],
        hasActiveWeek: false,
        workoutCount: 0,
      };
      blockMap.set(blockId, bg);
    }
    let wg = bg.weeks.find((x) => x.weekId === week.id);
    if (!wg) {
      wg = {
        weekId: week.id,
        weekNumber: week.week_number,
        name: week.name,
        description: week.description,
        isActive: week.is_active,
        days: [],
      };
      bg.weeks.push(wg);
      if (week.is_active) bg.hasActiveWeek = true;
    }
    wg.days.push(w);
    bg.workoutCount += 1;
  }

  const blocks = Array.from(blockMap.values()).sort((a, b) => a.blockNumber - b.blockNumber);
  for (const bg of blocks) bg.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  return { blocks, orphans };
}

function workoutStatus(w: ScheduleDay) {
  if (w.status === "completed") return { label: "Tehty", bg: "rgba(62,207,142,0.10)", color: "#3ECF8E" };
  return { label: "Odottaa", bg: "var(--c-surface3)", color: "var(--c-text-muted)" };
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span style={{ transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--c-text-muted)", display: "flex", flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)",
      background: "var(--c-surface2)", border: "1px solid var(--c-border)",
      padding: "3px 8px", borderRadius: 20,
    }}>{n}</span>
  );
}

function DayRow({ day, indent }: { day: ScheduleDay; indent: number }) {
  const router = useRouter();
  const st = workoutStatus(day);
  const exNames = (day.program_days?.program_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_idx - b.order_idx)
    .map((e) => e.exercises?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
  const infoExercises = (day.program_days?.program_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_idx - b.order_idx)
    .filter((e) => e.exercises != null)
    .map((e) => ({
      name: e.exercises!.name,
      instructions: e.exercises!.instructions,
      video_path: e.exercises!.video_path,
    }));
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/client/workout/${day.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(`/client/workout/${day.id}`); }}
      style={{
        padding: `12px 14px 12px ${indent}px`,
        borderTop: "1px solid var(--c-border)",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>
          {day.program_days?.name ?? `Treeni ${day.program_days?.day_number ?? ""}`}
        </div>
        {exNames && (
          <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {exNames}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600, whiteSpace: "nowrap" }}>
        {st.label}
      </span>
      {infoExercises.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <ExerciseInfoDialog
            exercises={infoExercises}
            title={day.program_days?.name ?? "Harjoitteet"}
            trigger={
              <button
                type="button"
                title="Katso harjoitteiden kuvaukset"
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  border: "1px solid var(--c-border)",
                  background: "var(--c-surface2)",
                  color: "var(--c-text-muted)",
                  fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                ?
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

function WeekCard({ wg, defaultOpen, expanded, setExpanded }: {
  wg: WeekGroup;
  defaultOpen: boolean;
  expanded: Record<string, boolean>;
  setExpanded: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  const explicit = expanded[wg.weekId];
  const open = explicit ?? defaultOpen;
  const completed = wg.days.filter((d) => d.status === "completed").length;
  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1px solid ${wg.isActive ? "rgba(255,29,140,0.25)" : "var(--c-border)"}`,
      borderRadius: 12, overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded((p) => ({ ...p, [wg.weekId]: !open }))}
        style={{
          width: "100%", padding: "12px 14px", background: "none", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          color: "var(--c-text)", fontFamily: "inherit",
        }}
      >
        <Chevron open={open} />
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            {wg.name?.trim() || `Viikko ${wg.weekNumber}`}
          </div>
          {wg.description && (
            <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {wg.description}
            </div>
          )}
        </div>
        {wg.isActive && (
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "var(--c-pink-dim)", color: "var(--c-pink)", fontWeight: 700 }}>
            Aktiivinen
          </span>
        )}
        <span style={{ fontSize: 10.5, color: "var(--c-text-subtle)", fontWeight: 600 }}>
          {completed}/{wg.days.length}
        </span>
      </button>
      <Collapse open={open}>
        {wg.days.map((day) => <DayRow key={day.id} day={day} indent={40} />)}
      </Collapse>
    </div>
  );
}

function BlockCard({ bg, defaultOpen, expanded, setExpanded }: {
  bg: BlockGroup;
  defaultOpen: boolean;
  expanded: Record<string, boolean>;
  setExpanded: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  const explicit = expanded[bg.blockId];
  const open = explicit ?? defaultOpen;
  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1px solid ${bg.hasActiveWeek ? "rgba(255,29,140,0.2)" : "var(--c-border)"}`,
      borderRadius: 14, overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded((p) => ({ ...p, [bg.blockId]: !open }))}
        style={{
          width: "100%", padding: "14px 16px", background: "none", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          color: "var(--c-text)", fontFamily: "inherit",
        }}
      >
        <Chevron open={open} />
        {bg.hasActiveWeek && (
          <span style={{ width: 4, height: 28, borderRadius: 2, background: "var(--c-pink)", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "var(--c-text-subtle)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Jakso {bg.blockNumber || ""}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {bg.name?.trim() || `Jakso ${bg.blockNumber}`}
          </div>
          <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>
            {bg.weeks.length} viikkoa · {bg.workoutCount} treeniä
          </div>
        </div>
        <CountBadge n={bg.workoutCount} />
      </button>
      <Collapse open={open}>
        <div style={{ borderTop: "1px solid var(--c-border)", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {bg.weeks.map((wg) => (
            <WeekCard
              key={wg.weekId}
              wg={wg}
              defaultOpen={wg.isActive}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          ))}
        </div>
      </Collapse>
    </div>
  );
}

export function OhjelmaView({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const schedule = useQuery({
    queryKey: ["schedule", clientId],
    queryFn: () => getClientSchedule(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const { blocks, orphans } = useMemo(
    () => buildHierarchy(schedule.data ?? []),
    [schedule.data]
  );

  const totalWorkouts = schedule.data?.length ?? 0;

  if (schedule.isLoading) {
    return (
      <div style={{ padding: "24px 20px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 72, borderRadius: 16, background: "var(--c-surface)", marginBottom: 12, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: "24px 20px 20px" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>Ohjelma</div>
        {blocks.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 3 }}>
            {blocks.length} jaksoa · {totalWorkouts} treeniä
          </div>
        )}
      </div>

      {blocks.length === 0 && orphans.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14 }}>Ei ohjelmaa vielä.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.map((bg) => (
          <BlockCard
            key={bg.blockId}
            bg={bg}
            defaultOpen={bg.hasActiveWeek}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        ))}

        {orphans.length > 0 && (
          <div style={{
            background: "var(--c-surface)",
            border: "1px dashed var(--c-border)",
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginBottom: 6 }}>
              Treenit ilman ohjelmaa ({orphans.length})
            </div>
            {orphans.map((day) => <DayRow key={day.id} day={day} indent={14} />)}
          </div>
        )}
      </div>
    </div>
  );
}
