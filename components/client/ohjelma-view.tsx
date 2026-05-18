"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

function NavArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
    </svg>
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
                  fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >?</button>
            }
          />
        </div>
      )}
    </div>
  );
}

function DotIndicator({
  total, current, onJump, activeIdx,
}: {
  total: number;
  current: number;
  onJump: (i: number) => void;
  activeIdx: number;
}) {
  // For many weeks, show only a window of dots around current with edge fades.
  const WINDOW = 9;
  const half = Math.floor(WINDOW / 2);
  let start = Math.max(0, current - half);
  const end = Math.min(total, start + WINDOW);
  start = Math.max(0, end - WINDOW);
  const dots = Array.from({ length: end - start }, (_, k) => start + k);
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, padding: "14px 20px 4px" }}>
      {dots.map((i) => {
        const isCurrent = i === current;
        const isActive = i === activeIdx;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Viikko ${i + 1}`}
            style={{
              width: isCurrent ? 22 : 6, height: 6, borderRadius: "var(--r-xs)",
              background: isCurrent
                ? "var(--c-pink)"
                : isActive ? "color-mix(in srgb, var(--c-pink) 50%, transparent)" : "var(--c-border-hover)",
              border: "none", padding: 0, cursor: "pointer",
              transition: "width 0.2s, background 0.2s",
              flexShrink: 0,
            }}
          />
        );
      })}
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  // Initial scroll to active week (no animation, once).
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || weeks.length === 0 || didInit.current) return;
    didInit.current = true;
    el.scrollLeft = activeIdx * el.clientWidth;
    setCurrentIdx(activeIdx);
  }, [activeIdx, weeks.length]);

  // Sync currentIdx with horizontal scroll (debounced via rAF).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    function handle() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el!.clientWidth;
        if (w === 0) return;
        const idx = Math.round(el!.scrollLeft / w);
        setCurrentIdx((prev) => (prev === idx ? prev : idx));
      });
    }
    el.addEventListener("scroll", handle, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", handle);
    };
  }, [weeks.length]);

  function jumpTo(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }

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

      <div style={{ position: "relative" }}>
        {currentIdx > 0 && (
          <button
            type="button"
            onClick={() => jumpTo(currentIdx - 1)}
            aria-label="Edellinen viikko"
            className="ohjelma-pager-arrow"
            style={navArrowStyle("left")}
          >
            <NavArrow dir="left" />
          </button>
        )}
        {currentIdx < weeks.length - 1 && (
          <button
            type="button"
            onClick={() => jumpTo(currentIdx + 1)}
            aria-label="Seuraava viikko"
            className="ohjelma-pager-arrow"
            style={navArrowStyle("right")}
          >
            <NavArrow dir="right" />
          </button>
        )}

        <div
          ref={scrollerRef}
          className="ohjelma-pager"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            width: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            touchAction: "pan-x",
          }}
        >
          {weeks.map((wp) => (
            <div
              key={wp.weekId}
              style={{
                flex: "0 0 100%",
                width: "100%",
                minWidth: "100%",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                boxSizing: "border-box",
              }}
            >
              <div style={{ padding: "0 20px" }}>
                <div className="ios-group">
                  {wp.days.map((day) => <DayRow key={day.id} day={day} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DotIndicator total={weeks.length} current={currentIdx} onJump={jumpTo} activeIdx={activeIdx} />

      {currentIdx !== activeIdx && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => jumpTo(activeIdx)}
            style={{
              fontSize: 11, fontWeight: 600,
              padding: "5px 12px", borderRadius: "var(--r-xl)",
              background: "var(--c-pink-dim)",
              color: "var(--c-pink)",
              border: "1px solid color-mix(in srgb, var(--c-pink) 25%, transparent)",
              cursor: "pointer",
            }}
          >
            ← Aktiiviseen viikkoon
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

function navArrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 4,
    zIndex: 4,
    width: 28, height: 28, borderRadius: "50%",
    background: "var(--c-surface)",
    border: "1px solid var(--c-border)",
    color: "var(--c-text-muted)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  };
}
