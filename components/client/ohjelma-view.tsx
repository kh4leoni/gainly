"use client";

import { useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getClientSchedule, type ScheduleDay } from "@/lib/queries/workouts";
import { ExerciseInfoDialog } from "@/components/client/exercise-info-dialog";

type WeekGroup = {
  weekId: string;
  weekNumber: number;
  description: string | null;
  isActive: boolean;
  days: ScheduleDay[];
};

function groupByWeek(workouts: ScheduleDay[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();
  for (const w of workouts) {
    const pw = w.program_days?.program_weeks;
    if (!pw) continue;
    if (!map.has(pw.id)) {
      map.set(pw.id, { weekId: pw.id, weekNumber: pw.week_number, description: pw.description, isActive: pw.is_active, days: [] });
    }
    map.get(pw.id)!.days.push(w);
  }
  return Array.from(map.values()).sort((a, b) => a.weekNumber - b.weekNumber);
}

function workoutStatus(w: ScheduleDay) {
  if (w.status === "completed") return { label: "Tehty", bg: "rgba(62,207,142,0.10)", color: "#3ECF8E" };
  return { label: "Odottaa", bg: "var(--c-surface3)", color: "var(--c-text-muted)" };
}

export function OhjelmaView({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const schedule = useQuery({
    queryKey: ["schedule", clientId],
    queryFn: () => getClientSchedule(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const weeks = groupByWeek(schedule.data ?? []);

  // Auto-expand active week
  const activeWeekId = weeks.find((w) => w.isActive)?.weekId;
  const isExpanded = (id: string) => expanded[id] ?? id === activeWeekId;

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
        {weeks.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 3 }}>
            {weeks.length} viikkoa · {schedule.data?.length ?? 0} treeeniä
          </div>
        )}
      </div>

      {weeks.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14 }}>Ei ohjelmaa vielä.</div>
        </div>
      )}

      {weeks.map((week) => {
        const open = isExpanded(week.weekId);
        return (
          <div
            key={week.weekId}
            style={{
              background: "var(--c-surface)",
              border: `1px solid ${week.isActive ? "rgba(255,29,140,0.2)" : "var(--c-border)"}`,
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            {/* Week header */}
            <button
              onClick={() => setExpanded((p) => ({ ...p, [week.weekId]: !open }))}
              style={{
                width: "100%",
                padding: "16px 18px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--c-text)",
                transition: "background 0.15s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span
                style={{
                  transition: "transform 0.2s",
                  transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                  color: "var(--c-text-muted)",
                  display: "flex",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {week.isActive ? "Tämä viikko" : `Viikko ${week.weekNumber}`}
                </div>
                {week.description && (
                  <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>{week.description}</div>
                )}
              </div>
              {week.isActive && (
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "var(--c-pink-dim)", color: "var(--c-pink)", fontWeight: 700 }}>
                  Aktiivinen
                </span>
              )}
            </button>

            {/* Days */}
            <Collapse open={open}>
              {week.days.map((day) => {
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
                    key={day.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/client/workout/${day.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/client/workout/${day.id}`); }}
                    style={{
                      padding: "12px 18px 12px 44px",
                      borderTop: "1px solid var(--c-border)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>
                        {day.program_days?.name ?? `Treeni ${day.program_days?.day_number ?? ""}`}
                      </div>
                      {exNames && (
                        <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 3 }}>{exNames}</div>
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
              })}
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}
