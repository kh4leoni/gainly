"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type ProgramExercise = {
  order_idx: number | null;
  exercises: { name: string } | null;
};

type WorkoutEntry = {
  id: string;
  scheduled_date: string;
  status: string;
  program_days: {
    name: string | null;
    description?: string | null;
    day_number?: number;
    program_exercises?: ProgramExercise[];
  } | null;
  workout_logs?: Array<{
    logged_at: string;
    set_logs: Array<{
      weight: number | null;
      reps: number | null;
      exercises: { name: string } | null;
    }>;
  }>;
};

type WeekGroup = {
  weekLabel: string;
  weekStart: string;
  workouts: WorkoutEntry[];
};

type Props = {
  upcomingWorkouts: unknown[];
  pastWorkouts: unknown[];
  weekDescription?: string | null;
};

function statusDotStyle(status: string): React.CSSProperties {
  if (status === "completed") {
    return {
      background: "radial-gradient(circle at 35% 35%, #34d399, #059669)",
      boxShadow: "0 0 6px 2px rgba(16,185,129,0.4)",
    };
  }
  return {
    background: "radial-gradient(circle at 35% 35%, #f472b6, #ec4899)",
    boxShadow: "0 0 6px 2px rgba(236,72,153,0.25)",
  };
}

export function ClientTrainingView({ upcomingWorkouts, pastWorkouts, weekDescription }: Props) {
  const [pastOpen, setPastOpen] = useState(false);

  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  const pastByWeek = groupWorkoutsByWeek(pastWorkouts as WorkoutEntry[]);
  const currentWeek = pastByWeek.find((w) => w.weekStart === currentWeekStart);
  const currentWeekWorkouts = currentWeek?.workouts ?? [];

  const upcoming = (upcomingWorkouts as WorkoutEntry[]).filter(
    (w) => w.scheduled_date >= currentWeekStart
  );
  const currentWeekAll = [...currentWeekWorkouts, ...upcoming].sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date)
  );

  const pastWeeks = pastByWeek.filter((w) => w.weekStart !== currentWeekStart);

  return (
    <div className="space-y-4">
      {/* Current Week */}
      <div className="rounded-2xl border bg-card">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Tämä viikko</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                Aktiivinen
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentWeekAll.length} treeni{currentWeekAll.length !== 1 ? "ä" : ""}
            </span>
          </div>
          {weekDescription && (
            <p className="mt-2 text-sm italic text-primary/80">{weekDescription}</p>
          )}
        </div>
        <div className="px-5 pb-5">
          {currentWeekAll.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Ei treenejä tällä viikolla.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {currentWeekAll.map((w) => (
                <WorkoutRow key={w.id} workout={w} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Weeks */}
      <div className="rounded-2xl border bg-card">
        <div className="px-5 py-4">
          <button
            onClick={() => setPastOpen(!pastOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {pastOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-base font-semibold">Menneet viikot</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {pastWeeks.length} viikko{pastWeeks.length !== 1 ? "a" : ""}
            </span>
          </button>
        </div>
        {pastOpen && (
          <div className="border-t px-5 pb-5 pt-4">
            {pastWeeks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ei menneitä treenejä.</p>
            ) : (
              <div className="space-y-3">
                {pastWeeks.map((wg) => (
                  <div key={wg.weekStart} className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
                      <span className="text-sm font-medium">{wg.weekLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(wg.weekStart).toLocaleDateString("fi-FI", {
                          day: "numeric",
                          month: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="divide-y divide-border/50 px-3">
                      {wg.workouts.map((w) => (
                        <WorkoutRow key={w.id} workout={w} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkoutRow({ workout }: { workout: WorkoutEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = workout.status === "completed";

  const exerciseNames = (workout.program_days?.program_exercises ?? [])
    .slice()
    .sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0))
    .map((pe) => pe.exercises?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="py-3">
      <button
        onClick={() => isCompleted && setExpanded(!expanded)}
        className="w-full text-left"
        disabled={!isCompleted}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={statusDotStyle(workout.status)}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {workout.program_days?.name ?? "Treeni"}
              </p>
              {workout.program_days?.description && (
                <p className="mt-0.5 text-xs italic text-muted-foreground">
                  {workout.program_days.description}
                </p>
              )}
              {exerciseNames.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {exerciseNames.join(" · ")}
                </p>
              )}
            </div>
          </div>
          <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
            {isCompleted
              ? expanded
                ? "↑"
                : "↓"
              : workout.status === "pending"
                ? "Odottaa"
                : workout.status}
          </span>
        </div>
      </button>

      {expanded && isCompleted && (
        <div className="ml-5 mt-2 rounded-lg bg-muted/20 px-3 py-2">
          {workout.workout_logs && workout.workout_logs.length > 0 ? (
            <div className="space-y-0.5">
              {workout.workout_logs.flatMap((wl) =>
                (wl.set_logs ?? []).map((sl, i) => (
                  <div key={i} className="flex items-center gap-4 py-0.5 text-xs">
                    <span className="min-w-[120px] text-muted-foreground">
                      {sl.exercises?.name ?? "—"}
                    </span>
                    <span>
                      {sl.weight ?? 0}kg × {sl.reps ?? 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ei kirjattuja sarjoja.</p>
          )}
        </div>
      )}
    </div>
  );
}

function groupWorkoutsByWeek(workouts: WorkoutEntry[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();
  for (const w of workouts) {
    const weekStart = getWeekStart(new Date(w.scheduled_date));
    const weekLabel = formatWeekLabel(new Date(weekStart));
    if (!map.has(weekStart)) map.set(weekStart, { weekStart, weekLabel, workouts: [] });
    map.get(weekStart)!.workouts.push(w);
  }
  return Array.from(map.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric" };
  return `${weekStart.toLocaleDateString("fi-FI", opts)} – ${weekEnd.toLocaleDateString("fi-FI", opts)}`;
}
