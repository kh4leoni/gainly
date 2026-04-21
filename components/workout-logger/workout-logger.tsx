"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { createClient } from "@/lib/supabase/client";
import { getScheduledWorkout } from "@/lib/queries/workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { uuid } from "@/lib/utils";
import { enqueue } from "@/lib/offline/queue";
import { db } from "@/lib/offline/db";
import { replay } from "@/lib/offline/sync";
import { toast } from "@/components/ui/use-toast";
import { Check, WifiOff } from "lucide-react";

export function WorkoutLogger({ scheduledWorkoutId }: { scheduledWorkoutId: string }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: workout } = useQuery({
    queryKey: ["workout", scheduledWorkoutId],
    queryFn: () => getScheduledWorkout(supabase, scheduledWorkoutId),
  });

  // Ensure we have a workout_log row for this session.
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  useEffect(() => {
    if (!workout) return;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) return;
      const { data: existing } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("scheduled_workout_id", scheduledWorkoutId)
        .eq("client_id", me.user.id)
        .maybeSingle();
      if (existing?.id) {
        setWorkoutLogId(existing.id);
        return;
      }
      // Create with a stable id so offline retry is idempotent.
      const id = uuid();
      await enqueue("workout_log.create", {
        id,
        client_id: me.user.id,
        scheduled_workout_id: scheduledWorkoutId,
      }, id);
      setWorkoutLogId(id);
      if (navigator.onLine) void replay();
    })();
  }, [workout, scheduledWorkoutId, supabase]);

  // Listen to sync trigger from SW.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "gainly-sync") void replay();
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, []);

  const pending = useLiveQuery(() => db?.pending_mutations.count() ?? 0, []) ?? 0;

  const complete = useMutation({
    mutationFn: async () => {
      await enqueue("workout.complete", { scheduled_workout_id: scheduledWorkoutId });
      if (navigator.onLine) await replay();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout", scheduledWorkoutId] });
      toast({ title: "Workout completed" });
    },
  });

  if (!workout) {
    return <div className="p-6"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;
  }

  const day = workout.program_days;

  return (
    <div className="p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{day?.name ?? "Workout"}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(workout.scheduled_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <Badge variant="outline" className="gap-1"><WifiOff className="h-3 w-3" /> {pending} pending</Badge>
          )}
          <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
            <Check className="h-4 w-4" /> Mark complete
          </Button>
        </div>
      </header>

      <div className="mt-6 space-y-4">
        {(day?.program_exercises ?? []).map((pe: any) => (
          <ExerciseBlock
            key={pe.id}
            programExercise={pe}
            workoutLogId={workoutLogId}
          />
        ))}
        {(!day || (day.program_exercises ?? []).length === 0) && (
          <p className="text-muted-foreground">No exercises in this session.</p>
        )}
      </div>
    </div>
  );
}

function ExerciseBlock({
  programExercise,
  workoutLogId,
}: {
  programExercise: any;
  workoutLogId: string | null;
}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: sets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId, programExercise.id],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("id, set_number, weight, reps, rpe, is_pr")
        .eq("workout_log_id", workoutLogId!)
        .eq("program_exercise_id", programExercise.id)
        .order("set_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const targetSets = programExercise.sets ?? 3;

  const add = useMutation({
    mutationFn: async (input: { weight: number | null; reps: number | null; rpe: number | null }) => {
      if (!workoutLogId) throw new Error("no workout log yet");
      const id = uuid();
      const last = sets.at(-1) as { set_number?: number | null } | undefined;
      const setNumber = (last?.set_number ?? 0) + 1;
      const optimistic = { id, set_number: setNumber, weight: input.weight, reps: input.reps, rpe: input.rpe, is_pr: false };
      // Optimistic update
      qc.setQueryData<any[]>(["set_logs", workoutLogId, programExercise.id], (old = []) => [...old, optimistic]);
      await enqueue("set_log.create", {
        id,
        workout_log_id: workoutLogId,
        exercise_id: programExercise.exercise_id,
        program_exercise_id: programExercise.id,
        set_number: setNumber,
        weight: input.weight,
        reps: input.reps,
        rpe: input.rpe,
      }, id);
      if (navigator.onLine) await replay();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["set_logs", workoutLogId, programExercise.id] }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {programExercise.exercises?.name ?? "Exercise"}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            · {targetSets}×{programExercise.reps ?? "—"}
            {programExercise.intensity ? ` @ ${programExercise.intensity}${programExercise.intensity_type === "percent_1rm" ? "%" : "kg"}` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1 text-sm">
          {sets.map((s: any) => (
            <li key={s.id} className="flex items-center justify-between rounded-md border p-2">
              <span>Set {s.set_number}: {s.weight ?? "—"}kg × {s.reps ?? "—"} {s.rpe != null && `@ RPE ${s.rpe}`}</span>
              {s.is_pr && <Badge variant="success">PR</Badge>}
            </li>
          ))}
        </ul>
        <SetRow targetWeight={programExercise.intensity ?? null} targetReps={programExercise.reps ?? null} onLog={(v) => add.mutate(v)} />
      </CardContent>
    </Card>
  );
}

function SetRow({
  targetWeight,
  targetReps,
  onLog,
}: {
  targetWeight: number | null;
  targetReps: string | null;
  onLog: (v: { weight: number | null; reps: number | null; rpe: number | null }) => void;
}) {
  const [weight, setWeight] = useState<string>(targetWeight ? String(targetWeight) : "");
  const [reps, setReps] = useState<string>(targetReps ?? "");
  const [rpe, setRpe] = useState<string>("");

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted-foreground">Weight (kg)</label>
        <Input className="w-24" type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Reps</label>
        <Input className="w-20" type="number" value={reps} onChange={(e) => setReps(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">RPE</label>
        <Input className="w-20" type="number" step="0.5" value={rpe} onChange={(e) => setRpe(e.target.value)} />
      </div>
      <Button
        onClick={() =>
          onLog({
            weight: weight ? Number(weight) : null,
            reps: reps ? Number(reps) : null,
            rpe: rpe ? Number(rpe) : null,
          })
        }
      >
        Log set
      </Button>
    </div>
  );
}
