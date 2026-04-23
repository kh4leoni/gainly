"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getProgramFull, type ProgramFull } from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { AssignProgramButton } from "./assign-program-button";

function isAutoDayName(name: string | null | undefined): boolean {
  if (!name) return true;
  return /^(päivä|day|treeni)\s*\d*$/i.test(name.trim());
}

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

  const setActiveWeek = useMutation({
    mutationFn: async (weekId: string) => {
      const weeks = program?.program_weeks ?? [];
      // Deactivate all weeks in this program first
      const { error: e1 } = await supabase
        .from("program_weeks")
        .update({ is_active: false })
        .in("id", weeks.map((w) => w.id));
      if (e1) throw e1;
      // Activate the chosen week
      const { error: e2 } = await supabase.from("program_weeks").update({ is_active: true }).eq("id", weekId);
      if (e2) throw e2;
    },
    onMutate: async (weekId) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const w of next.program_weeks ?? []) {
          w.is_active = w.id === weekId;
        }
        return next;
      });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const updateWeek = useMutation({
    mutationFn: async (patch: { id: string; description: string | null }) => {
      const { error } = await supabase.from("program_weeks").update({ description: patch.description }).eq("id", patch.id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        const w = next.program_weeks?.find((w) => w.id === patch.id);
        if (w) w.description = patch.description;
        return next;
      });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const addDay = useMutation({
    mutationFn: async (weekId: string) => {
      const week = program?.program_weeks?.find((w) => w.id === weekId);
      const next = (week?.program_days?.length ?? 0) + 1;
      const { error } = await supabase.from("program_days").insert({
        week_id: weekId, day_number: next, name: null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateDay = useMutation({
    mutationFn: async (patch: { id: string; name?: string | null; description?: string | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_days").update(rest).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const w of next.program_weeks ?? []) {
          const d = w.program_days?.find((d) => d.id === patch.id);
          if (d) Object.assign(d, patch);
        }
        return next;
      });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const deleteDay = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_days").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const w of next.program_weeks ?? []) {
          w.program_days = w.program_days?.filter((d) => d.id !== id);
        }
        return next;
      });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
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
        target_rpe: null,
        rest_sec: null,
        notes: null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateExercise = useMutation({
    mutationFn: async (patch: { id: string; sets?: number | null; reps?: string | null; rest_sec?: number | null; intensity?: number | null; target_rpe?: number | null; notes?: string | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_exercises").update(rest).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const w of next.program_weeks ?? []) {
          for (const d of w.program_days ?? []) {
            const pe = d.program_exercises?.find((e) => e.id === patch.id);
            if (pe) Object.assign(pe, patch);
          }
        }
        return next;
      });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
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
        {[...(program.program_weeks ?? [])].sort((a, b) => {
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          return a.week_number - b.week_number;
        }).map((w: ProgramFull["program_weeks"][number]) => (
          <Card key={w.id} className={w.is_active ? "ring-2 ring-emerald-500/50" : ""}>
            <CardHeader className="space-y-0 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Viikko {w.week_number}</CardTitle>
                  {!program.is_template && (
                    <button
                      type="button"
                      onClick={() => { if (!w.is_active) setActiveWeek.mutate(w.id); }}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        w.is_active
                          ? "bg-emerald-500/15 text-emerald-500 cursor-default"
                          : "bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                      }`}
                      title={w.is_active ? "Aktiivinen viikko" : "Aseta aktiiviseksi"}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${w.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {w.is_active ? "Aktiivinen" : "Ei aktiivinen"}
                    </button>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => addDay.mutate(w.id)}>
                  <Plus className="h-4 w-4" /> Treeni
                </Button>
              </div>
              <textarea
                key={`week-desc:${w.id}:${w.description ?? ""}`}
                className="mt-1.5 w-full resize-none rounded border bg-background px-2 py-1.5 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                rows={2}
                defaultValue={w.description ?? ""}
                placeholder="Viikon kuvaus tai ohjeet asiakkaalle (valinnainen)…"
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== (w.description ?? null)) updateWeek.mutate({ id: w.id, description: v });
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {(w.program_days ?? []).map((d) => {
                const displayName = isAutoDayName(d.name) ? "" : (d.name ?? "");
                return (
                <div key={d.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Treeni {d.day_number}</span>
                      <Input
                        key={`${d.id}:${d.name ?? ""}`}
                        className="h-8 w-48"
                        defaultValue={displayName}
                        placeholder="Nimi (esim. Vetävät)"
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (displayName || null)) updateDay.mutate({ id: d.id, name: v });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <AddExerciseControl
                        exercises={exercises}
                        onAdd={(exId) => addExercise.mutate({ dayId: d.id, exerciseId: exId })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => deleteDay.mutate(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <textarea
                    key={`day-desc:${d.id}:${d.description ?? ""}`}
                    className="mt-2 w-full resize-none rounded border bg-background px-2 py-1.5 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={2}
                    defaultValue={d.description ?? ""}
                    placeholder="Treenin kuvaus tai ohjeet asiakkaalle (valinnainen)…"
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (d.description ?? null)) updateDay.mutate({ id: d.id, description: v });
                    }}
                  />

                  <ul className="mt-3 space-y-2">
                    {(d.program_exercises ?? []).map((pe) => (
                      <li key={pe.id} className="rounded-md border bg-muted/30 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="w-32 shrink-0 text-sm font-medium">
                            {(pe.exercises as any)?.name ?? "—"}
                          </span>
                          <input
                            key={`pe-notes:${pe.id}:${pe.notes ?? ""}`}
                            className="h-8 min-w-0 flex-1 rounded border bg-background px-2 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                            defaultValue={pe.notes ?? ""}
                            placeholder="Ohjeet…"
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== pe.notes) updateExercise.mutate({ id: pe.id, notes: v });
                            }}
                          />
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
                            placeholder="kuorma"
                            type="number"
                            onBlur={(e) => {
                              const v = e.target.value ? Number(e.target.value) : null;
                              if (v !== pe.intensity) updateExercise.mutate({ id: pe.id, intensity: v });
                            }}
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded border text-sm font-medium hover:bg-muted"
                              onClick={() => {
                                const cur = pe.target_rpe;
                                if (cur === null) return;
                                if (cur === 0) updateExercise.mutate({ id: pe.id, target_rpe: null });
                                else if (cur <= 6) updateExercise.mutate({ id: pe.id, target_rpe: 0 });
                                else updateExercise.mutate({ id: pe.id, target_rpe: cur - 0.5 });
                              }}
                            >
                              −
                            </button>
                            <span className="w-10 text-center text-sm">
                              {pe.target_rpe === null ? "—" : pe.target_rpe === 0 ? "< 6" : pe.target_rpe}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded border text-sm font-medium hover:bg-muted"
                              onClick={() => {
                                const cur = pe.target_rpe;
                                if (cur === null) updateExercise.mutate({ id: pe.id, target_rpe: 6 });
                                else if (cur === 0) updateExercise.mutate({ id: pe.id, target_rpe: 6 });
                                else if (cur >= 10) return;
                                else updateExercise.mutate({ id: pe.id, target_rpe: cur + 0.5 });
                              }}
                            >
                              +
                            </button>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => deleteExercise.mutate(pe.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                    {(d.program_exercises ?? []).length === 0 && (
                      <li className="text-sm text-muted-foreground">Ei vielä harjoituksia.</li>
                    )}
                  </ul>
                </div>
                );
              })}
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function pick(id: string) {
    onAdd(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        className="h-8 w-[200px] rounded border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Lisää liike…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-56 w-56 overflow-auto rounded-md border bg-background shadow-lg">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(ev) => { ev.preventDefault(); pick(e.id); }}
            >
              {e.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
