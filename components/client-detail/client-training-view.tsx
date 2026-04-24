"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type ProgramExercise = {
  order_idx: number | null;
  exercises: { name: string } | null;
};

type SetLog = {
  set_number: number | null;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  is_pr: boolean;
  exercises: { name: string } | null;
};

type ExerciseNote = {
  notes: string;
  program_exercises: { exercises: { name: string } | null } | null;
};

type WorkoutLog = {
  id: string;
  logged_at: string;
  notes: string | null;
  workout_exercise_notes: ExerciseNote[];
  set_logs: SetLog[];
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
  workout_logs?: WorkoutLog[];
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

// Pick the workout_log row with the most set_logs — handles legacy cases
// where a scheduled_workout has multiple workout_logs and only one holds data.
function pickRichestLog(logs: WorkoutLog[] | undefined): WorkoutLog | null {
  if (!logs || logs.length === 0) return null;
  let best = logs[0]!;
  for (const l of logs) {
    if ((l.set_logs?.length ?? 0) > (best.set_logs?.length ?? 0)) best = l;
  }
  return best;
}

export function ClientTrainingView({ upcomingWorkouts, pastWorkouts, weekDescription }: Props) {
  const [historyOpen, setHistoryOpen] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);

  const allPast = (pastWorkouts as WorkoutEntry[]).filter((w) => w.status === "completed");
  const historyByWeek = groupWorkoutsByWeek(allPast);

  const upcoming = (upcomingWorkouts as WorkoutEntry[])
    .filter((w) => w.status !== "completed" && w.scheduled_date >= todayStr)
    .slice()
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <div className="space-y-4">
      {/* Tulevat treenit */}
      <div className="rounded-2xl border bg-card">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Tulevat treenit</h2>
              <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-xs font-medium text-pink-400">
                Aktiivinen
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {upcoming.length} treeni{upcoming.length !== 1 ? "ä" : ""}
            </span>
          </div>
          {weekDescription && (
            <p className="mt-2 text-sm italic text-primary/80">{weekDescription}</p>
          )}
        </div>
        <div className="px-5 pb-5">
          {upcoming.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Ei tulevia treenejä.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {upcoming.map((w) => (
                <WorkoutRow key={w.id} workout={w} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historia */}
      <div className="rounded-2xl border bg-card">
        <div className="px-5 py-4">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {historyOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-base font-semibold">Historia</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {allPast.length} treeni{allPast.length !== 1 ? "ä" : ""}
            </span>
          </button>
        </div>
        {historyOpen && (
          <div className="border-t px-5 pb-5 pt-4">
            {historyByWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ei suoritettuja treenejä.</p>
            ) : (
              <div className="space-y-3">
                {historyByWeek.map((wg) => (
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

  const wl = pickRichestLog(workout.workout_logs);
  const setsByExercise = groupSetsByExercise(wl?.set_logs ?? []);
  const exNotesByName = buildExerciseNoteMap(wl?.workout_exercise_notes ?? []);

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
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {workout.program_days?.name ?? "Treeni"}
                </p>
                <span className="text-xs text-muted-foreground">
                  {new Date(workout.scheduled_date).toLocaleDateString("fi-FI", {
                    day: "numeric",
                    month: "numeric",
                  })}
                </span>
              </div>
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
              ? expanded ? "↑" : "↓"
              : workout.status === "pending" ? "Odottaa" : workout.status}
          </span>
        </div>
      </button>

      {expanded && isCompleted && (
        <div className="ml-5 mt-2 space-y-2">
          {wl?.notes && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary/60">
                Asiakkaan muistiinpano
              </p>
              <p className="text-xs text-foreground">{wl.notes}</p>
            </div>
          )}

          {setsByExercise.length > 0 ? (
            <div className="rounded-lg bg-muted/20 px-3 py-2 space-y-2">
              {setsByExercise.map(({ name, sets }) => {
                const exNote = exNotesByName[name];
                return (
                  <div key={name}>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">{name}</p>
                    <div className="space-y-0.5">
                      {sets.map((sl, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="w-12 text-muted-foreground">
                            Sarja {sl.set_number ?? i + 1}
                          </span>
                          <span className="font-medium">
                            {sl.weight ?? 0} kg × {sl.reps ?? 0}
                          </span>
                          {sl.rpe != null && (
                            <span className="rounded-full bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-pink-400">
                              RPE {sl.rpe === 5 ? "<6" : sl.rpe}
                            </span>
                          )}
                          {sl.is_pr && (
                            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                              PR
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {exNote && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                        {exNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ei kirjattuja sarjoja.</p>
          )}
        </div>
      )}
    </div>
  );
}

function groupSetsByExercise(sets: SetLog[]): Array<{ name: string; sets: SetLog[] }> {
  const order: string[] = [];
  const map = new Map<string, SetLog[]>();
  for (const s of [...sets].sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))) {
    const name = s.exercises?.name ?? "—";
    if (!map.has(name)) { map.set(name, []); order.push(name); }
    map.get(name)!.push(s);
  }
  return order.map((name) => ({ name, sets: map.get(name)! }));
}

function buildExerciseNoteMap(notes: ExerciseNote[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of notes) {
    const name = n.program_exercises?.exercises?.name;
    if (name) out[name] = n.notes;
  }
  return out;
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
