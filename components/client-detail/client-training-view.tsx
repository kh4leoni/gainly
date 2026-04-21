"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

type WorkoutEntry = {
  id: string;
  scheduled_date: string;
  status: string;
  program_days: {
    name: string | null;
    day_number: number;
    program_exercises?: Array<{
      id: string;
      sets: number | null;
      reps: string | null;
      intensity: number | null;
      intensity_type: string | null;
      exercises: { name: string } | null;
    }>;
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
};

export function ClientTrainingView({ upcomingWorkouts, pastWorkouts }: Props) {
  const [currentWeekOpen, setCurrentWeekOpen] = useState(true);
  const [pastOpen, setPastOpen] = useState(false);

  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  const pastByWeek = groupWorkoutsByWeek(pastWorkouts as WorkoutEntry[]);
  const currentWeek = pastByWeek.find(
    (w) => w.weekStart === currentWeekStart
  );

  const currentWeekWorkouts = currentWeek?.workouts ?? [];

  // Upcoming workouts that are scheduled for future (already in upcomingWorkouts)
  const upcoming = (upcomingWorkouts as WorkoutEntry[]).filter(
    (w) => w.scheduled_date >= currentWeekStart
  );
  const currentWeekAll = [...currentWeekWorkouts, ...upcoming].sort(
    (a, b) => a.scheduled_date.localeCompare(b.scheduled_date)
  );

  const pastWeeks = pastByWeek.filter(
    (w) => w.weekStart !== currentWeekStart
  );

  return (
    <div className="mt-6 space-y-4">
      {/* Current Week */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentWeekOpen(!currentWeekOpen)}
              className="flex items-center gap-2 text-left"
            >
              {currentWeekOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CardTitle className="text-base">Tämä viikko</CardTitle>
            </button>
            <Badge variant="outline">
              {currentWeekAll.length} treeni{currentWeekAll.length !== 1 ? "ä" : ""}
            </Badge>
          </div>
        </CardHeader>
        {currentWeekOpen && (
          <CardContent>
            {currentWeekAll.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Ei treenejä tällä viikolla.</p>
            ) : (
              <div className="space-y-1">
                {currentWeekAll.map((w) => (
                  <WorkoutRow key={w.id} workout={w} />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Past Weeks */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPastOpen(!pastOpen)}
              className="flex items-center gap-2 text-left"
            >
              {pastOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CardTitle className="text-base">Menneet viikot</CardTitle>
            </button>
            <Badge variant="secondary">
              {pastWeeks.length} viikko{pastWeeks.length !== 1 ? "a" : ""}
            </Badge>
          </div>
        </CardHeader>
        {pastOpen && (
          <CardContent>
            {pastWeeks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Ei menneitä treenejä.</p>
            ) : (
              <div className="space-y-3">
                {pastWeeks.map((wg) => {
                  const isOpen = false;
                  return (
                    <div key={wg.weekStart} className="rounded-md border">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                        <span className="text-sm font-medium">{wg.weekLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(wg.weekStart).toLocaleDateString("fi-FI", {
                            day: "numeric",
                            month: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="divide-y">
                        {wg.workouts.map((w) => (
                          <WorkoutRow key={w.id} workout={w} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function WorkoutRow({ workout }: { workout: WorkoutEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = workout.status === "completed";

  return (
    <div className="divide-y first:last-child-divide-y-0">
      <button
        onClick={() => isCompleted && setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-2 py-2 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          {isCompleted ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
          <span className="text-sm">
            {new Date(workout.scheduled_date).toLocaleDateString("fi-FI", {
              weekday: "short",
              day: "numeric",
              month: "numeric",
            })}{" "}
            — {workout.program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni"}
          </span>
        </div>
        <Badge variant={isCompleted ? "success" : "secondary"}>
          {isCompleted ? "Valmis" : workout.status === "pending" ? "Odottaa" : workout.status}
        </Badge>
      </button>

      {expanded && isCompleted && (
        <div className="bg-muted/20 px-4 pb-3 pt-2">
          {workout.workout_logs && workout.workout_logs.length > 0 ? (
            <div className="space-y-1">
              {workout.workout_logs.flatMap((wl) =>
                (wl.set_logs ?? []).map((sl, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm py-0.5">
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

    if (!map.has(weekStart)) {
      map.set(weekStart, { weekStart, weekLabel, workouts: [] });
    }
    map.get(weekStart)!.workouts.push(w);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.weekStart.localeCompare(a.weekStart)
  );
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
