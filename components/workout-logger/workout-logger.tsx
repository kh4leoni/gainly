"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { createClient } from "@/lib/supabase/client";
import { getScheduledWorkout } from "@/lib/queries/workouts";
import { uuid } from "@/lib/utils";
import { enqueue } from "@/lib/offline/queue";
import { db } from "@/lib/offline/db";
import { replay } from "@/lib/offline/sync";
import { toast } from "@/components/ui/use-toast";

// ── RPE ───────────────────────────────────────────────────────────────────────
// Stored as numeric. "<6" is stored as 5 (midpoint of RPE 1..5 range) so the
// DB formula (coalesce rpe,10) yields meaningful RIR=5 instead of treating
// null as "max effort". null in set_logs means "no RPE recorded".
const RPE_STEPS = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

function rpeLabel(v: number | null | undefined): string {
  if (v === undefined || v === null) return "–";
  if (v === 5) return "<6";
  return String(v);
}

function targetRpeIdx(t: number | null): number {
  if (t === null) return 0;                 // not set → default to <6
  if (t === 0 || t === 5) return 0;         // legacy 0 OR new 5 encode "<6"
  const i = (RPE_STEPS as readonly number[]).indexOf(t);
  return i >= 0 ? i : 0;
}

// ── Main logger ───────────────────────────────────────────────────────────────
export function WorkoutLogger({ scheduledWorkoutId }: { scheduledWorkoutId: string }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: workout } = useQuery({
    queryKey: ["workout", scheduledWorkoutId],
    queryFn: () => getScheduledWorkout(supabase, scheduledWorkoutId),
  });

  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [dayNote, setDayNote] = useState("");

  useEffect(() => {
    if (!workoutLogId) return;
    // Try DB first (for returning to a previously synced workout); fall back gracefully
    supabase.from("workout_logs").select("notes").eq("id", workoutLogId).maybeSingle()
      .then(({ data }) => { if (data?.notes) setDayNote(data.notes); });
  }, [workoutLogId, supabase]);

  async function saveDayNote(text: string) {
    if (!workoutLogId) return;
    const notes = text.trim() || null;
    await enqueue("workout_log.update_notes", { id: workoutLogId, notes });
    if (navigator.onLine) void replay();
  }

  useEffect(() => {
    if (!workout) return;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) return;
      // Use limit(1) rather than maybeSingle(): legacy rows sometimes had
      // more than one workout_log per (scheduled_workout, client), and
      // maybeSingle() errors in that case. Dedup migration cleans them up;
      // this guard stays defensive for fresh installs.
      const { data: existing } = await supabase
        .from("workout_logs").select("id")
        .eq("scheduled_workout_id", scheduledWorkoutId)
        .eq("client_id", me.user.id)
        .order("logged_at", { ascending: true })
        .limit(1);
      const existingId = existing?.[0]?.id;
      if (existingId) { setWorkoutLogId(existingId); return; }
      const id = uuid();
      await enqueue("workout_log.create", { id, client_id: me.user.id, scheduled_workout_id: scheduledWorkoutId }, id);
      setWorkoutLogId(id);
      if (navigator.onLine) void replay();
    })();
  }, [workout, scheduledWorkoutId, supabase]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "gainly-sync") void replay(); };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, []);

  const pending = useLiveQuery(() => db?.pending_mutations.count() ?? 0, []) ?? 0;
  const [syncing, setSyncing] = useState(false);

  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    try {
      await replay();
      qc.invalidateQueries({ queryKey: ["set_logs"] });
    } finally {
      setSyncing(false);
    }
  }

  const complete = useMutation({
    mutationFn: async () => {
      // Flush any queued set_logs/notes first — the PR trigger needs the sets
      // in the DB before the workout flips to completed, and the refetch below
      // expects them on read.
      await replay();
      const sb = createClient();
      const { error } = await sb
        .from("scheduled_workouts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", scheduledWorkoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      const clientId = workout?.client_id;
      qc.invalidateQueries({ queryKey: ["workout", scheduledWorkoutId] });
      qc.invalidateQueries({ queryKey: ["set_logs"] });
      if (clientId) {
        qc.invalidateQueries({ queryKey: ["today", clientId] });
        qc.invalidateQueries({ queryKey: ["schedule", clientId] });
        qc.invalidateQueries({ queryKey: ["compliance", clientId] });
        qc.invalidateQueries({ queryKey: ["streak", clientId] });
        qc.invalidateQueries({ queryKey: ["prs", clientId] });
      }
      qc.invalidateQueries({ queryKey: ["coach-dashboard"] });
      qc.invalidateQueries({ queryKey: ["client-workouts"] });
      toast({ title: "Treeni tallennettu! 🎉" });
    },
    onError: (e: any) => {
      toast({ title: "Virhe tallennuksessa", description: e?.message ?? "Yritä uudelleen." });
    },
  });

  const isCompleted = workout?.status === "completed";

  // All confirmed set_logs for this workout — used to gate the complete button.
  const { data: loggedSets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("program_exercise_id")
        .eq("workout_log_id", workoutLogId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Include still-queued set_log.create mutations for immediate feedback.
  const pendingSetLogs = useLiveQuery(async () => {
    if (!db || !workoutLogId) return [] as { program_exercise_id: string | null }[];
    const all = await db.pending_mutations.toArray();
    return all
      .filter((m) => m.kind === "set_log.create")
      .map((m) => (m.payload as { workout_log_id?: string; program_exercise_id?: string | null }))
      .filter((p) => p.workout_log_id === workoutLogId)
      .map((p) => ({ program_exercise_id: p.program_exercise_id ?? null }));
  }, [workoutLogId]) ?? [];

  if (!workout) {
    return (
      <div className="client-app" style={{ padding: "20px 16px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 90, borderRadius: 16, background: "var(--c-surface)", marginBottom: 12, opacity: 0.4 }} />
        ))}
      </div>
    );
  }

  const day = workout.program_days;
  const exercises = (day?.program_exercises ?? []).slice().sort((a: any, b: any) => a.order_idx - b.order_idx);

  // Ready = every exercise has at least its target-sets worth of confirmed sets.
  const setCountByPe = new Map<string, number>();
  for (const s of loggedSets) {
    const id = s.program_exercise_id as string | null;
    if (id) setCountByPe.set(id, (setCountByPe.get(id) ?? 0) + 1);
  }
  for (const p of pendingSetLogs) {
    if (p.program_exercise_id) setCountByPe.set(p.program_exercise_id, (setCountByPe.get(p.program_exercise_id) ?? 0) + 1);
  }
  const targetsByPe = exercises.map((pe: any) => {
    const target = pe.set_configs?.length ?? pe.sets ?? 3;
    const done = setCountByPe.get(pe.id) ?? 0;
    return { id: pe.id, target, done, name: pe.exercises?.name ?? "Harjoitus" };
  });
  const pendingExercises = targetsByPe.filter((t: { done: number; target: number }) => t.done < t.target);
  const allSetsConfirmed = pendingExercises.length === 0 && exercises.length > 0;

  return (
    <div className="client-app" style={{ flex: 1, overflowY: "auto", padding: "20px 14px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        {day?.program_weeks && (
          <div style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
            Viikko {day.program_weeks.week_number}
          </div>
        )}
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>{day?.name ?? "Treeni"}</div>
        <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
          {new Date(workout.scheduled_date).toLocaleDateString("fi-FI")}
        </div>
        {day?.description && (
          <div style={{ fontSize: 13, color: "var(--c-text-muted)", fontStyle: "italic", marginTop: 8, lineHeight: 1.5 }}>
            {day.description}
          </div>
        )}
        {pending > 0 && (
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
              fontSize: 11, color: syncing ? "var(--c-pink)" : "var(--c-text-muted)",
              background: "var(--c-surface)", border: `1px solid ${syncing ? "rgba(255,29,140,0.3)" : "var(--c-border)"}`,
              borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}>
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            {syncing ? "Synkronoidaan…" : `${pending} synkronoimatta — synkronoi`}
          </button>
        )}
      </div>

      {isCompleted && (
        <div style={{
          background: "rgba(62,207,142,0.10)",
          border: "1px solid rgba(62,207,142,0.35)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3ECF8E" }}>
            Treeni merkitty valmiiksi
            {workout.completed_at && (
              <span style={{ fontWeight: 400, color: "var(--c-text-muted)", marginLeft: 6 }}>
                {new Date(workout.completed_at).toLocaleDateString("fi-FI")}
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exercises.map((pe: any) => (
          <ExerciseBlock key={pe.id} programExercise={pe} workoutLogId={workoutLogId} scheduledWorkoutId={scheduledWorkoutId} locked={isCompleted} />
        ))}
        {exercises.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-text-muted)", fontSize: 14 }}>
            Ei harjoituksia tässä treeniä.
          </div>
        )}
      </div>

      {/* Day note */}
      <div style={{ marginTop: 20 }}>
        <textarea
          value={dayNote}
          onChange={(e) => setDayNote(e.target.value)}
          onBlur={(e) => saveDayNote(e.target.value)}
          placeholder="Muistiinpanoja treenistä…"
          rows={3}
          readOnly={isCompleted}
          style={{
            width: "100%", resize: "none",
            background: isCompleted ? "var(--c-surface2)" : "var(--c-surface)",
            border: "1px solid var(--c-border)", borderRadius: 14,
            padding: "12px 14px", fontSize: 14, color: "var(--c-text)",
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            opacity: isCompleted ? 0.8 : 1,
          }}
        />
      </div>

      {/* Complete (hidden when already completed, disabled until every set is confirmed) */}
      {!isCompleted && (
        <>
          <button
            onClick={() => complete.mutate()}
            disabled={complete.isPending || !allSetsConfirmed}
            title={!allSetsConfirmed ? "Merkitse kaikki sarjat tehdyksi ensin" : undefined}
            style={{
              marginTop: 20, width: "100%", padding: "15px", borderRadius: 14,
              background: allSetsConfirmed ? "var(--c-green)" : "var(--c-surface2)",
              border: allSetsConfirmed ? "none" : "1px solid var(--c-border)",
              color: allSetsConfirmed ? "#fff" : "var(--c-text-muted)",
              fontSize: 15, fontWeight: 700,
              cursor: complete.isPending || !allSetsConfirmed ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: allSetsConfirmed ? "0 0 24px rgba(62,207,142,0.3)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: complete.isPending ? 0.6 : 1, transition: "all 0.2s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={allSetsConfirmed ? "white" : "var(--c-text-muted)"}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {complete.isPending ? "Tallennetaan..." : "Merkitse valmiiksi"}
          </button>
          {!allSetsConfirmed && (
            <div style={{
              marginTop: 10, fontSize: 12, color: "var(--c-text-muted)",
              textAlign: "center", lineHeight: 1.5,
            }}>
              Merkitse kaikki sarjat tehdyksi ennen treenin tallennusta
              {pendingExercises.length > 0 && pendingExercises.length <= 3 && (
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--c-text-subtle)" }}>
                  Puuttuu: {pendingExercises.map((p: { name: string; done: number; target: number }) => `${p.name} (${p.done}/${p.target})`).join(", ")}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Row state ─────────────────────────────────────────────────────────────────
type RowState = {
  weight: string;
  reps: string;
  rpeIdx: number;   // index into RPE_STEPS, -1 = not picked
  confirmed: boolean;
  isPr: boolean;
};

function makeRows(
  count: number,
  targetWeight: number | null,
  targetReps: string | null,
  rpeIdxes: number[],   // per-set
): RowState[] {
  return Array.from({ length: count }, (_, i) => ({
    weight: targetWeight != null ? String(targetWeight) : "",
    reps: targetReps ?? "",
    rpeIdx: rpeIdxes[i] ?? 0,
    confirmed: false,
    isPr: false,
  }));
}

type SetConfig = { reps: string | null; weight: number | null; rpe: number | null };

/** Build initial RowState array from programExercise, honouring set_configs first */
function resolveInitialRows(pe: any): RowState[] {
  const cfgs: SetConfig[] | null = pe.set_configs ?? null;
  if (cfgs && cfgs.length > 0) {
    return cfgs.map((c) => ({
      weight: c.weight != null ? String(c.weight) : (pe.intensity != null ? String(pe.intensity) : ""),
      reps: c.reps ?? pe.reps ?? "",
      rpeIdx: targetRpeIdx(c.rpe ?? null),
      confirmed: false,
      isPr: false,
    }));
  }
  // Legacy fallback
  const sets: number = pe.sets ?? 3;
  const perSetRpe: (number | null)[] | null = pe.target_rpes ?? null;
  return Array.from({ length: sets }, (_, i) => ({
    weight: pe.intensity != null ? String(pe.intensity) : "",
    reps: pe.reps ?? "",
    rpeIdx: targetRpeIdx(perSetRpe ? (perSetRpe[i] ?? null) : (pe.target_rpe ?? null)),
    confirmed: false,
    isPr: false,
  }));
}

// ── Exercise block ────────────────────────────────────────────────────────────
function ExerciseBlock({ programExercise, workoutLogId, scheduledWorkoutId, locked = false }: { programExercise: any; workoutLogId: string | null; scheduledWorkoutId: string; locked?: boolean }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const targetSets: number = (programExercise.set_configs?.length) ?? programExercise.sets ?? 3;

  const [rows, setRows] = useState<RowState[]>(() => resolveInitialRows(programExercise));

  // ── Exercise note ──
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { data: existingNote } = useQuery({
    queryKey: ["exercise_note", workoutLogId, programExercise.id],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_exercise_notes")
        .select("notes")
        .eq("workout_log_id", workoutLogId!)
        .eq("program_exercise_id", programExercise.id)
        .maybeSingle();
      return data?.notes ?? null;
    },
  });

  useEffect(() => {
    if (existingNote != null) { setNoteText(existingNote); setNoteOpen(true); }
  }, [existingNote]);

  const saveNote = useMutation({
    mutationFn: async (text: string) => {
      if (!workoutLogId) return;
      if (!text.trim()) {
        await enqueue("exercise_note.delete", {
          workout_log_id: workoutLogId, program_exercise_id: programExercise.id,
        });
      } else {
        await enqueue("exercise_note.upsert", {
          workout_log_id: workoutLogId, program_exercise_id: programExercise.id, notes: text.trim(),
        });
      }
      if (navigator.onLine) void replay();
    },
  });

  const { data: sets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId, programExercise.id],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs").select("id, set_number, weight, reps, rpe, is_pr")
        .eq("workout_log_id", workoutLogId!)
        .eq("program_exercise_id", programExercise.id)
        .order("set_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Merge DB sets into row state. Runs whenever sets data changes so returning
  // to a completed workout always shows the persisted values.
  useEffect(() => {
    if (sets.length === 0) return;
    setRows((prev) =>
      prev.map((r, i) => {
        const s = sets[i] as any;
        if (!s) return r;
        const dbRpeIdx = s.rpe === null
          ? -1
          : (RPE_STEPS as readonly number[]).indexOf(s.rpe as number);
        return {
          weight: s.weight != null ? String(s.weight) : r.weight,
          reps: s.reps != null ? String(s.reps) : r.reps,
          rpeIdx: dbRpeIdx >= 0 ? dbRpeIdx : r.rpeIdx,
          confirmed: true,
          isPr: !!s.is_pr,
        };
      })
    );
  }, [sets]);

  const add = useMutation({
    mutationFn: async ({ rowIdx, row }: { rowIdx: number; row: RowState }) => {
      if (!workoutLogId) throw new Error("no workout log");
      const id = uuid();
      const setNumber = rowIdx + 1;
      const rpe: number | null = row.rpeIdx >= 0 ? RPE_STEPS[row.rpeIdx] ?? null : null;
      await enqueue("set_log.create", {
        id, workout_log_id: workoutLogId,
        scheduled_workout_id: scheduledWorkoutId,
        exercise_id: programExercise.exercise_id,
        exercise_name: programExercise.exercises?.name ?? null,
        program_exercise_id: programExercise.id,
        set_number: setNumber,
        weight: row.weight ? Number(row.weight) : null,
        reps: row.reps ? Number(row.reps) : null,
        rpe,
      }, id);
      if (navigator.onLine) await replay();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["set_logs", workoutLogId] }),
  });

  const unconfirm = useMutation({
    mutationFn: async (rowIdx: number) => {
      const existing = sets.find((s: any) => s.set_number === rowIdx + 1);
      if (!existing) return;
      const { error } = await supabase.from("set_logs").delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: (_d, rowIdx) => {
      setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, confirmed: false } : r));
      qc.invalidateQueries({ queryKey: ["set_logs", workoutLogId] });
    },
  });

  function confirmRow(i: number) {
    if (locked) return;
    const row = rows[i];
    if (!row || row.confirmed) return;
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, confirmed: true } : r));
    add.mutate({ rowIdx: i, row });
  }

  function updateRow(i: number, patch: Partial<RowState>) {
    if (locked) return;
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  const confirmedCount = rows.filter((r) => r.confirmed).length;
  const allDone = confirmedCount === targetSets;

  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1px solid ${allDone ? "rgba(62,207,142,0.25)" : "var(--c-border)"}`,
      borderRadius: 18,
      overflow: "hidden",
    }}>
      {/* ── Card header ── */}
      <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Progress circle */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${allDone ? "#3ECF8E" : "var(--c-border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: allDone ? "rgba(62,207,142,0.12)" : "var(--c-surface2)",
          transition: "all 0.2s",
        }}>
          {allDone
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)" }}>{confirmedCount}/{targetSets}</span>
          }
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {programExercise.exercises?.name ?? "Harjoitus"}
            </div>
            <button
              type="button"
              onClick={() => { setNoteOpen((o) => !o); }}
              title="Lisää muistiinpano"
              style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--c-border)",
                background: noteOpen ? "rgba(255,29,140,0.1)" : "var(--c-surface2)",
                color: noteOpen ? "var(--c-pink)" : "var(--c-text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
            {(() => {
              const cfgs: SetConfig[] | null = programExercise.set_configs?.length > 0 ? programExercise.set_configs : null;
              if (cfgs) {
                return cfgs.map((c, i) => {
                  const repsLabel = c.reps ? `${c.reps} toistoa` : "— toistoa";
                  const rpeLabel = c.rpe != null ? `, rpe ${c.rpe}` : "";
                  return (
                    <span key={i} style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
                      sarja {i + 1}: {repsLabel}{rpeLabel}
                    </span>
                  );
                });
              }
              const rpeVals: (number | null)[] = programExercise.target_rpes
                ?? (programExercise.target_rpe != null ? Array(targetSets).fill(programExercise.target_rpe) : []);
              return (
                <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
                  {targetSets} × {programExercise.reps ?? "—"} toistoa
                  {rpeVals.length > 0 && !rpeVals.every((v) => v === null) && (
                    <span style={{ marginLeft: 6 }}>
                      {rpeVals.map((v, i) => (
                        <span key={i} style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 12, marginLeft: 3,
                          background: "rgba(255,29,140,0.12)", color: "var(--c-pink)",
                          border: "1px solid rgba(255,29,140,0.25)",
                        }}>
                          {v === null ? "<6" : String(v)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ paddingBottom: 4 }}>
        {/* Column headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 30px",
          gap: 3, padding: "0 8px 6px",
          borderBottom: "1px solid var(--c-border)",
        }}>
          <span style={{ fontSize: 10, color: "var(--c-text-subtle)", fontWeight: 600 }}>#</span>
          <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600, textAlign: "center" }}>Paino (kg)</span>
          <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600, textAlign: "center" }}>Toistot</span>
          <span style={{ fontSize: 10, color: "var(--c-pink)", fontWeight: 600, textAlign: "center" }}>RPE</span>
          <span />
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <SetTableRow
            key={i}
            rowNum={i + 1}
            row={row}
            locked={locked}
            onChange={(patch) => updateRow(i, patch)}
            onConfirm={() => confirmRow(i)}
            onUnconfirm={() => { if (!locked) unconfirm.mutate(i); }}
          />
        ))}
      </div>

      {/* Coach notes */}
      {programExercise.notes && (
        <div style={{ padding: "8px 14px 10px", fontSize: 12, color: "var(--c-text-muted)", fontStyle: "italic", borderTop: "1px solid var(--c-border)" }}>
          {programExercise.notes}
        </div>
      )}

      {/* Client note */}
      {noteOpen && (
        <div style={{ borderTop: "1px solid var(--c-border)", padding: "10px 12px" }}>
          <textarea
            autoFocus={!noteText}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={(e) => saveNote.mutate(e.target.value)}
            placeholder="Muistiinpano tähän liikkeeseen…"
            rows={2}
            style={{
              width: "100%", resize: "none", background: "var(--c-surface2)",
              border: "1px solid var(--c-border)", borderRadius: 10,
              padding: "8px 10px", fontSize: 13, color: "var(--c-text)",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Shared stepper cell ───────────────────────────────────────────────────────
function StepperCell({
  display, disabled, onDec, onInc, canDec, canInc,
  rawValue, onRawChange, inputMode, inputStep,
}: {
  display: string;
  disabled: boolean;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
  // if provided the center becomes an editable input
  rawValue?: string;
  onRawChange?: (v: string) => void;
  inputMode?: "decimal" | "numeric";
  inputStep?: string;
}) {
  function btn(active: boolean, onClick: () => void, label: string) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!active || disabled}
        style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: (!active || disabled) ? "transparent" : "var(--c-surface3)",
          border: `1px solid ${(!active || disabled) ? "transparent" : "var(--c-border)"}`,
          color: (!active || disabled) ? "var(--c-text-subtle)" : "var(--c-text)",
          fontSize: 15, fontWeight: 700,
          cursor: (!active || disabled) ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit", lineHeight: 1, padding: 0,
          transition: "background 0.1s",
        }}
      >{label}</button>
    );
  }

  const centerStyle: React.CSSProperties = {
    flex: 1, textAlign: "center", lineHeight: 1,
    fontSize: 13, fontWeight: 700,
    color: display === "–" ? "var(--c-text-subtle)" : "var(--c-text)",
    background: disabled ? "transparent" : "var(--c-surface2)",
    border: `1px solid ${disabled ? "transparent" : "var(--c-border)"}`,
    borderRadius: 7, padding: "8px 1px",
    minWidth: 0, outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
      {btn(canDec, onDec, "−")}
      {onRawChange ? (
        <input
          type="number"
          inputMode={inputMode ?? "decimal"}
          step={inputStep ?? "any"}
          value={rawValue ?? ""}
          onChange={(e) => onRawChange(e.target.value)}
          disabled={disabled}
          placeholder="–"
          style={{ ...centerStyle, width: "100%", minWidth: 0 }}
          onFocus={(e) => { if (!disabled) e.target.style.borderColor = "var(--c-pink)"; }}
          onBlur={(e) => { e.target.style.borderColor = disabled ? "transparent" : "var(--c-border)"; }}
        />
      ) : (
        <div style={{ ...centerStyle, minWidth: 0 }}>{display}</div>
      )}
      {btn(canInc, onInc, "+")}
    </div>
  );
}

// ── Set table row ─────────────────────────────────────────────────────────────
function SetTableRow({
  rowNum, row, onChange, onConfirm, onUnconfirm, locked = false,
}: {
  rowNum: number;
  row: RowState;
  onChange: (patch: Partial<RowState>) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  locked?: boolean;
}) {
  const inputsDisabled = row.confirmed || locked;
  // Weight helpers (step 2.5 kg, min 0, empty = not set)
  const weightNum = row.weight !== "" ? parseFloat(row.weight) : null;
  function decWeight() {
    if (weightNum === null || weightNum <= 0) return;
    const next = Math.max(0, weightNum - 2.5);
    onChange({ weight: next === 0 ? "0" : String(next) });
  }
  function incWeight() {
    if (weightNum === null) { onChange({ weight: "20" }); return; }
    onChange({ weight: String(weightNum + 2.5) });
  }

  // Reps helpers (step 1, min 1, empty = not set)
  const repsNum = row.reps !== "" ? parseInt(row.reps, 10) : null;
  function decReps() {
    if (repsNum === null || repsNum <= 1) return;
    onChange({ reps: String(repsNum - 1) });
  }
  function incReps() {
    if (repsNum === null) { onChange({ reps: "1" }); return; }
    onChange({ reps: String(repsNum + 1) });
  }

  // RPE helpers
  const currentRpe = row.rpeIdx >= 0 ? RPE_STEPS[row.rpeIdx] : undefined;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 30px",
      gap: 3, padding: "6px 8px",
      borderBottom: "1px solid var(--c-border)",
      background: row.isPr ? "rgba(245,166,35,0.05)" : "transparent",
      opacity: row.confirmed ? 0.7 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* # */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: row.isPr ? "#F5A623" : "var(--c-text-subtle)" }}>
          {row.isPr ? "🏆" : rowNum}
        </span>
      </div>

      {/* Weight */}
      <StepperCell
        display={row.weight !== "" ? row.weight : "–"}
        disabled={inputsDisabled}
        canDec={weightNum !== null && weightNum > 0}
        canInc={true}
        onDec={decWeight}
        onInc={incWeight}
        rawValue={row.weight}
        onRawChange={(v) => onChange({ weight: v })}
        inputMode="decimal"
        inputStep="0.5"
      />

      {/* Reps */}
      <StepperCell
        display={row.reps !== "" ? row.reps : "–"}
        disabled={inputsDisabled}
        canDec={repsNum !== null && repsNum > 1}
        canInc={true}
        onDec={decReps}
        onInc={incReps}
        rawValue={row.reps}
        onRawChange={(v) => onChange({ reps: v })}
        inputMode="numeric"
        inputStep="1"
      />

      {/* RPE */}
      <StepperCell
        display={currentRpe !== undefined ? rpeLabel(currentRpe) : "–"}
        disabled={inputsDisabled}
        canDec={row.rpeIdx > 0}
        canInc={row.rpeIdx < RPE_STEPS.length - 1}
        onDec={() => onChange({ rpeIdx: Math.max(0, row.rpeIdx - 1) })}
        onInc={() => onChange({ rpeIdx: row.rpeIdx < 0 ? 0 : Math.min(RPE_STEPS.length - 1, row.rpeIdx + 1) })}
      />

      {/* Confirm / Unconfirm */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          type="button"
          onClick={row.confirmed ? onUnconfirm : onConfirm}
          disabled={locked}
          title={locked ? "Lukittu" : row.confirmed ? "Peru sarja" : "Merkitse tehdyksi"}
          style={{
            width: 30, height: 30, borderRadius: "50%", padding: 0, flexShrink: 0,
            background: row.confirmed ? "rgba(62,207,142,0.15)" : "var(--c-surface2)",
            border: `1px solid ${row.confirmed ? "rgba(62,207,142,0.4)" : "var(--c-border)"}`,
            cursor: locked ? "default" : "pointer",
            opacity: locked ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          } as React.CSSProperties}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke={row.confirmed ? "#3ECF8E" : "var(--c-text-subtle)"}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
