"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { createClient } from "@/lib/supabase/client";
import { getScheduledWorkout } from "@/lib/queries/workouts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      toast({ title: "Treeni valmis" });
    },
  });

  if (!workout) {
    return <div className="p-6"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;
  }

  const day = workout.program_days;

  return (
    <div className="p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {day?.program_weeks ? `Viikko ${day.program_weeks.week_number}` : null}
          </p>
          <h1 className="text-3xl font-bold">{day?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(workout.scheduled_date).toLocaleDateString("fi-FI")}
          </p>
          {day?.program_weeks?.description && (
            <p className="mt-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {day.program_weeks.description}
            </p>
          )}
          {day?.description && (
            <p className="mt-2 text-sm text-foreground/80">{day.description}</p>
          )}
        </div>
        {pending > 0 && (
          <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1.5">
            <WifiOff className="h-4 w-4" /> {pending} odottaa synkronointia
          </Badge>
        )}
      </header>

      <button
        onClick={() => complete.mutate()}
        disabled={complete.isPending}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-base shadow-sm disabled:opacity-60 active:scale-[0.97] transition-transform duration-150"
      >
        <Check className="h-5 w-5" />
        Merkitse valmiiksi
      </button>

      <div className="mt-6 space-y-6">
        {(day?.program_exercises ?? []).map((pe: any) => (
          <ExerciseBlock
            key={pe.id}
            programExercise={pe}
            workoutLogId={workoutLogId}
          />
        ))}
        {(!day || (day.program_exercises ?? []).length === 0) && (
          <p className="text-muted-foreground">Ei harjoituksia tässä istunnossa.</p>
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
    <section className="border-l-4 border-primary pl-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">
          {programExercise.exercises?.name ?? "Exercise"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {targetSets}×{programExercise.reps ?? "—"}
          {programExercise.intensity
            ? ` @ ${programExercise.intensity}${programExercise.intensity_type === "percent_1rm" ? "%" : "kg"}`
            : ""}
          {programExercise.target_rpe !== null
            ? ` · RPE ${programExercise.target_rpe === 0 ? "< 6" : programExercise.target_rpe}`
            : ""}
        </p>
        {programExercise.notes && (
          <p className="mt-1.5 text-sm italic text-muted-foreground">{programExercise.notes}</p>
        )}
      </div>

      <ul className="mb-3 space-y-1.5">
        {sets.map((s: any) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span>Sarja {s.set_number}: {s.weight ?? "—"}kg × {s.reps ?? "—"}{s.rpe != null ? ` @ RPE ${s.rpe}` : " @ RPE < 6"}</span>
            {s.is_pr && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                Uusi ennätys! 🏆
              </span>
            )}
          </li>
        ))}
      </ul>

      <SetRow
        targetWeight={programExercise.intensity ?? null}
        targetReps={programExercise.reps ?? null}
        targetRpe={programExercise.target_rpe ?? null}
        onLog={(v) => add.mutate(v)}
      />
    </section>
  );
}

function SetRow({
  targetWeight,
  targetReps,
  targetRpe,
  onLog,
}: {
  targetWeight: number | null;
  targetReps: string | null;
  targetRpe: number | null;
  onLog: (v: { weight: number | null; reps: number | null; rpe: number | null }) => void;
}) {
  const [weight, setWeight] = useState<string>(targetWeight ? String(targetWeight) : "");
  const [reps, setReps] = useState<string>(targetReps ?? "");
  const [rpe, setRpe] = useState<string>(targetRpe !== null ? String(targetRpe === 0 ? "< 6" : targetRpe) : "");

  const RPE_VALUES: (number | "< 6")[] = ["< 6" as const, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-end md:gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Paino (kg)</label>
          <Input
            className="h-14 text-xl text-center"
            type="number"
            step="0.5"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Toistot</label>
          <Input
            className="h-14 text-xl text-center"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">
          RPE {targetRpe ? `(tavoite: ${targetRpe})` : "(6–10, 0.5 välein)"}
        </label>
        <div className="flex flex-wrap gap-1">
          {RPE_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRpe(String(v))}
              className={`h-9 min-w-[40px] rounded-md border px-2 text-sm font-medium transition-colors ${
                rpe === String(v)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() =>
          onLog({
            weight: weight ? Number(weight) : null,
            reps: reps ? Number(reps) : null,
            rpe: rpe && rpe !== "< 6" ? Number(rpe) : null,
          })
        }
        className="flex h-14 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-base active:scale-[0.97] transition-transform duration-150"
      >
        Kirjaa sarja
      </button>
    </div>
  );
}