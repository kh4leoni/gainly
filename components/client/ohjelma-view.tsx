"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getClientSchedule, type ScheduleDay } from "@/lib/queries/workouts";
import { ExerciseInfoDialog } from "@/components/client/exercise-info-dialog";
import { stripCopySuffix } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardText } from "@phosphor-icons/react";
import { Eyebrow, Subtitle, Caption } from "@/components/ui/typography";

type WeekPane = {
  weekId: string;
  weekNumber: number;
  weekName: string | null;
  description: string | null;
  isActive: boolean;
  blockId: string;
  blockNumber: number;
  blockName: string | null;
  days: ScheduleDay[];
};

function buildWeeks(workouts: ScheduleDay[]): { weeks: WeekPane[]; orphans: ScheduleDay[] } {
  const orphans: ScheduleDay[] = [];
  const byWeek = new Map<string, WeekPane>();

  for (const w of workouts) {
    const week = w.program_days?.program_weeks;
    if (!week) { orphans.push(w); continue; }
    const block = week.program_blocks;
    let pane = byWeek.get(week.id);
    if (!pane) {
      pane = {
        weekId: week.id,
        weekNumber: week.week_number,
        weekName: week.name,
        description: week.description,
        isActive: week.is_active,
        blockId: block?.id ?? `__noblock_${week.id}`,
        blockNumber: block?.block_number ?? 0,
        blockName: block?.name ?? null,
        days: [],
      };
      byWeek.set(week.id, pane);
    }
    pane.days.push(w);
  }

  const weeks = Array.from(byWeek.values()).sort(
    (a, b) => a.blockNumber - b.blockNumber || a.weekNumber - b.weekNumber
  );
  for (const w of weeks) {
    w.days.sort((a, b) => (a.program_days?.day_number ?? 0) - (b.program_days?.day_number ?? 0));
  }
  return { weeks, orphans };
}

function WeekChips({
  weeks,
  current,
  active,
  onSelect,
}: {
  weeks: WeekPane[];
  current: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll the selected chip into view when current changes.
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const chip = row.children[current] as HTMLElement | undefined;
    if (!chip) return;
    const rowRect = row.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    if (chipRect.left < rowRect.left || chipRect.right > rowRect.right) {
      chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [current]);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: 8,
        padding: "4px 20px 12px",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
      className="ohjelma-week-chips"
    >
      {weeks.map((w, i) => {
        const selected = i === current;
        const isLive = i === active;
        return (
          <button
            key={w.weekId}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={selected}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderRadius: "var(--r-pill)",
              border: `1px solid ${selected
                ? "color-mix(in srgb, var(--c-pink) 35%, transparent)"
                : "var(--c-border)"}`,
              background: selected ? "var(--c-pink-dim)" : "var(--c-surface)",
              color: selected ? "var(--c-pink)" : "var(--c-text-muted)",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.2px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "background var(--d-fast) var(--ease-ios), color var(--d-fast) var(--ease-ios), border-color var(--d-fast) var(--ease-ios)",
            }}
          >
            Vk {w.weekNumber}
            {isLive && (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--c-pink)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayRow({ day }: { day: ScheduleDay }) {
  const router = useRouter();
  const done = day.status === "completed";
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
      className="ios-group-row"
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
      <StatusPill kind={done ? "done" : "pending"} compact />
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
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

export function OhjelmaView({ clientId }: { clientId: string }) {
  const supabase = createClient();

  const schedule = useQuery({
    queryKey: ["schedule", clientId],
    queryFn: () => getClientSchedule(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const { weeks, orphans } = useMemo(
    () => buildWeeks(schedule.data ?? []),
    [schedule.data]
  );

  const activeIdx = useMemo(() => {
    const i = weeks.findIndex((w) => w.isActive);
    return i === -1 ? 0 : i;
  }, [weeks]);

  const [currentIdx, setCurrentIdx] = useState(activeIdx);
  const didInit = useRef(false);

  // First render: jump to the live week without animation.
  useEffect(() => {
    if (didInit.current || weeks.length === 0) return;
    didInit.current = true;
    setCurrentIdx(activeIdx);
  }, [activeIdx, weeks.length]);

  const current = weeks[currentIdx];
  const totalWorkouts = schedule.data?.length ?? 0;

  if (schedule.isLoading) {
    return (
      <div style={{ padding: "24px 20px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 72, borderRadius: "var(--r-lg)", background: "var(--c-surface)", marginBottom: 12, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (weeks.length === 0 && orphans.length === 0) {
    return (
      <div style={{ flex: 1, padding: "0 20px" }}>
        <EmptyState
          icon={ClipboardText}
          title="Ei ohjelmaa vielä"
          description="Valmentaja luo ohjelmasi pian. Tämä näkymä päivittyy automaattisesti."
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: "0 0 24px" }}>
      <div style={{ padding: "0 20px", marginBottom: 10, display: "flex", alignItems: "baseline", justifyContent: "flex-end" }}>
        <Caption>{weeks.length} viikkoa · {totalWorkouts} treeniä</Caption>
      </div>

      {current && (
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <Eyebrow tone="subtle" style={{ letterSpacing: "0.7px" }}>
              {stripCopySuffix(current.blockName) || `Jakso ${current.blockNumber || "—"}`}
            </Eyebrow>
            <Caption>{currentIdx + 1} / {weeks.length}</Caption>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--c-text)", letterSpacing: "-0.3px" }}>
              {stripCopySuffix(current.weekName) || `Viikko ${current.weekNumber}`}
            </div>
            {current.isActive && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--r-xl)",
                background: "var(--c-pink-dim)", color: "var(--c-pink)",
                textTransform: "uppercase", letterSpacing: "0.7px",
              }}>
                Aktiivinen
              </span>
            )}
          </div>
          {current.description && (
            <Subtitle style={{ marginTop: 4, fontSize: 12 }}>{current.description}</Subtitle>
          )}
        </div>
      )}

      <WeekChips
        weeks={weeks}
        current={currentIdx}
        active={activeIdx}
        onSelect={setCurrentIdx}
      />

      {current && (
        <div style={{ padding: "0 20px" }}>
          <div className="ios-group">
            {current.days.map((day) => <DayRow key={day.id} day={day} />)}
          </div>
        </div>
      )}

      {currentIdx !== activeIdx && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <button
            type="button"
            onClick={() => setCurrentIdx(activeIdx)}
            style={{
              fontSize: 11, fontWeight: 600,
              padding: "6px 14px", borderRadius: "var(--r-pill)",
              background: "var(--c-pink-dim)",
              color: "var(--c-pink)",
              border: "1px solid color-mix(in srgb, var(--c-pink) 25%, transparent)",
              cursor: "pointer",
            }}
          >
            Aktiiviseen viikkoon
          </button>
        </div>
      )}

      {orphans.length > 0 && (
        <div style={{ margin: "22px 20px 0" }}>
          <span className="ios-group-label">Treenit ilman ohjelmaa ({orphans.length})</span>
          <div className="ios-group" style={{ borderStyle: "dashed" }}>
            {orphans.map((day) => <DayRow key={day.id} day={day} />)}
          </div>
        </div>
      )}
    </div>
  );
}

