"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getProgramFull, type ProgramFull } from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { AssignProgramButton } from "./assign-program-button";

function getNextMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function ProgramEditor({ programId }: { programId: string }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ["program", programId],
    queryFn: () => getProgramFull(supabase, programId),
  });
  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => getExercises(supabase),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["program", programId] });

  const [saveLabel, setSaveLabel] = useState("Tallenna");

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!program?.client_id) return;
      // Use the earliest existing scheduled_date as the anchor so the schedule stays aligned
      const { data: existing } = await supabase
        .from("scheduled_workouts")
        .select("scheduled_date")
        .eq("program_id", programId)
        .eq("client_id", program.client_id)
        .order("scheduled_date")
        .limit(1)
        .single();
      const startDate = existing?.scheduled_date ?? getNextMonday(new Date());
      const { error } = await supabase.rpc("schedule_program", {
        _program: programId,
        _client: program.client_id,
        _start_date: startDate,
      });
      if (error) throw error;
    },
  });

  async function handleSave() {
    if (rescheduleMutation.isPending) return;
    try {
      await rescheduleMutation.mutateAsync();
      setSaveLabel("Tallennettu!");
    } catch (e) {
      console.error(e);
      setSaveLabel("Virhe!");
    }
    invalidate();
    setTimeout(() => setSaveLabel("Tallenna"), 1500);
  }

  const addWeek = useMutation({
    mutationFn: async () => {
      const next = (program?.program_weeks?.length ?? 0) + 1;
      const { error } = await supabase.from("program_weeks").insert({ program_id: programId, week_number: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addDay = useMutation({
    mutationFn: async (weekId: string) => {
      const week = program?.program_weeks?.find((w) => w.id === weekId);
      const next = (week?.program_days?.length ?? 0) + 1;
      const { error } = await supabase.from("program_days").insert({
        week_id: weekId, day_number: next, name: `Päivä ${next}`,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addExercise = useMutation({
    mutationFn: async ({ dayId, exerciseId }: { dayId: string; exerciseId: string }) => {
      const day = program?.program_weeks
        .flatMap((w) => w.program_days ?? [])
        .find((d) => d.id === dayId);
      const next = (day?.program_exercises?.length ?? 0);
      const { error } = await supabase.from("program_exercises").insert({
        day_id: dayId,
        exercise_id: exerciseId,
        order_idx: next,
        sets: 3,
        reps: "8",
        intensity: null,
        intensity_type: null,
        rest_sec: null,
        notes: null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateExercise = useMutation({
    mutationFn: async (patch: { id: string; sets?: number | null; reps?: string | null; rest_sec?: number | null; intensity?: number | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_exercises").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  if (!program) {
    return <div className="p-6"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{program.title}</h1>
          {program.description && <p className="text-sm text-muted-foreground">{program.description}</p>}
        </div>
        <div className="flex gap-2">
          {program.is_template ? (
            <AssignProgramButton programId={programId} />
          ) : (
            <span className="text-sm text-muted-foreground">
              {(program as any).client_profile?.full_name
                ? `Henkilökohtainen ohjelma: ${(program as any).client_profile.full_name}`
                : "Henkilökohtainen ohjelma"}
            </span>
          )}
          {!program.is_template && (
            <Button variant="outline" onClick={handleSave}>
              {saveLabel}
            </Button>
          )}
          <Button variant="outline" onClick={() => addWeek.mutate()}>
            <Plus className="h-4 w-4" /> Lisää viikko
          </Button>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        {(program.program_weeks ?? []).map((w: ProgramFull["program_weeks"][number]) => (
          <Card key={w.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Viikko {w.week_number}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => addDay.mutate(w.id)}>
                <Plus className="h-4 w-4" /> Päivä
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(w.program_days ?? []).map((d) => (
                <div key={d.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Päivä {d.day_number}{d.name ? ` · ${d.name}` : ""}
                    </div>
                    <AddExerciseControl
                      exercises={exercises}
                      onAdd={(exId) => addExercise.mutate({ dayId: d.id, exerciseId: exId })}
                    />
                  </div>

                  <ul className="mt-3 space-y-2">
                    {(d.program_exercises ?? []).map((pe) => (
                      <li key={pe.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">
                          {(pe.exercises as any)?.name ?? "—"}
                        </span>
                        <input
                          className="h-8 w-14 rounded border px-2 text-sm"
                          defaultValue={pe.sets ?? ""}
                          placeholder="sarjat"
                          type="number"
                          min={0}
                          onBlur={(e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            if (v !== pe.sets) updateExercise.mutate({ id: pe.id, sets: v });
                          }}
                        />
                        <input
                          className="h-8 w-20 rounded border px-2 text-sm"
                          defaultValue={pe.reps ?? ""}
                          placeholder="toistot"
                          onBlur={(e) => {
                            const v = e.target.value || null;
                            if (v !== pe.reps) updateExercise.mutate({ id: pe.id, reps: v });
                          }}
                        />
                        <input
                          className="h-8 w-20 rounded border px-2 text-sm"
                          defaultValue={pe.intensity ?? ""}
                          placeholder="kg/%"
                          type="number"
                          onBlur={(e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            if (v !== pe.intensity) updateExercise.mutate({ id: pe.id, intensity: v });
                          }}
                        />
                        <input
                          className="h-8 w-20 rounded border px-2 text-sm"
                          defaultValue={pe.rest_sec ?? ""}
                          placeholder="rest s"
                          type="number"
                          onBlur={(e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            if (v !== pe.rest_sec) updateExercise.mutate({ id: pe.id, rest_sec: v });
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => deleteExercise.mutate(pe.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                    {(d.program_exercises ?? []).length === 0 && (
                      <li className="text-sm text-muted-foreground">Ei vielä harjoituksia.</li>
                    )}
                  </ul>
                </div>
              ))}
              {(w.program_days ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Ei vielä päiviä.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddExerciseControl({
  exercises,
  onAdd,
}: {
  exercises: Array<{ id: string; name: string }>;
  onAdd: (id: string) => void;
}) {
  return (
    <Select onValueChange={(v) => onAdd(v)}>
      <SelectTrigger className="h-8 w-[220px]">
        <SelectValue placeholder="Lisää harjoitus…" />
      </SelectTrigger>
      <SelectContent>
        {exercises.map((e) => (
          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
