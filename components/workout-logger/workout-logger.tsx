"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getScheduledWorkout, getLastSetsByReps } from "@/lib/queries/workouts";
import { toast } from "@/components/ui/use-toast";
import { ExerciseInfoDialog } from "@/components/client/exercise-info-dialog";
import { ExerciseHistoryDialog } from "@/components/client/exercise-history-dialog";
import { usePageTitle } from "@/lib/page-title-context";
import { PlateLoaderDialog } from "@/components/client/plate-loader-dialog";
import { SyncBadge } from "@/components/offline/sync-badge";
import {
  completeWorkout,
  deleteSet,
  ensureWorkoutLog,
  logSet,
} from "@/lib/offline/writes";
import { getDB } from "@/lib/offline/db";
import {
  hydrateSetLogs,
  hydrateWorkoutLog,
  mergeById,
  useDeletedSetIds,
  useLocalScheduledWorkout,
  useLocalSetLogs,
  useLocalSetLogsAndDeleted,
  useLocalWorkoutLog,
} from "@/lib/offline/reads";

// ── RPE ───────────────────────────────────────────────────────────────────────
// Stored as numeric. "<6" is stored as 5 so the DB formula (coalesce rpe,10)
// yields meaningful effort instead of treating null as "max effort".
const RPE_STEPS = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

function rpeLabel(v: number | null | undefined): string {
  if (v === undefined || v === null) return "–";
  if (v === 5) return "<6";
  return String(v);
}

function targetRpeIdx(t: number | null): number {
  if (t === null) return 0;
  if (t === 0 || t === 5) return 0;
  const i = (RPE_STEPS as readonly number[]).indexOf(t);
  return i >= 0 ? i : 0;
}

// ── Main logger ───────────────────────────────────────────────────────────────
export function WorkoutLogger({ scheduledWorkoutId }: { scheduledWorkoutId: string }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const router = useRouter();
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: workout, error: workoutError, isLoading: workoutLoading } = useQuery({
    queryKey: ["workout", scheduledWorkoutId],
    queryFn: () => getScheduledWorkout(supabase, scheduledWorkoutId),
    // Don't bubble RLS / network failures to a parent boundary —
    // the offline / cross-user case has to render a friendly fallback
    // below instead of crashing the whole tree.
    retry: false,
    throwOnError: false,
  });

  // Publish workout day name as the shell's page title so the large→compact
  // title handoff (scroll-driven fade) applies to the logger view too.
  usePageTitle(workout?.program_days?.name ?? "Treeni");

  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [dayNote, setDayNote] = useState("");
  const localWorkoutLog = useLocalWorkoutLog(scheduledWorkoutId);
  const localScheduledWorkout = useLocalScheduledWorkout(scheduledWorkoutId);

  useEffect(() => {
    if (!workout) return;
    const clientId = workout.client_id;
    if (!clientId) return;
    let cancelled = false;
    (async () => {

      let serverId: string | null = null;
      let serverNotes: string | null = null;
      try {
        const { data: existing } = await supabase
          .from("workout_logs")
          .select("id, notes, scheduled_workout_id, client_id, logged_at, updated_at")
          .eq("scheduled_workout_id", scheduledWorkoutId)
          .eq("client_id", clientId)
          .order("logged_at", { ascending: true })
          .limit(1);
        if (existing && existing[0]) {
          serverId = existing[0].id;
          serverNotes = existing[0].notes;
          await hydrateWorkoutLog(existing[0]);
        }
      } catch {
        // offline — fall through to local
      }

      if (cancelled) return;

      const local = await ensureWorkoutLog({
        scheduled_workout_id: scheduledWorkoutId,
        client_id: clientId,
        existingId: serverId,
      });
      if (cancelled) return;
      setWorkoutLogId(local.id);
      if (serverNotes) setDayNote(serverNotes);
      else if (local.notes) setDayNote(local.notes);
    })();
    return () => { cancelled = true; };
  }, [workout, scheduledWorkoutId, supabase]);

  useEffect(() => {
    if (localWorkoutLog && !workoutLogId) setWorkoutLogId(localWorkoutLog.id);
  }, [localWorkoutLog, workoutLogId]);

  async function saveDayNote(text: string) {
    if (!workoutLogId) return;
    const notes = text.trim() || null;
    await supabase.from("workout_logs").update({ notes }).eq("id", workoutLogId);
  }

  const complete = useMutation({
    mutationFn: async () => {
      const clientId = workout?.client_id;
      if (!clientId) throw new Error("not signed in");
      await completeWorkout({
        scheduled_workout_id: scheduledWorkoutId,
        client_id: clientId,
        scheduled_date: null,
        program_id: null,
        day_id: null,
      });
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
        qc.invalidateQueries({ queryKey: ["past-workouts", clientId] });
      }
      qc.invalidateQueries({ queryKey: ["coach-dashboard"] });
      qc.invalidateQueries({ queryKey: ["client-workouts"] });
      setShowCelebration(true);
    },
    onError: (e: any) => {
      toast({ title: "Virhe tallennuksessa", description: e?.message ?? "Yritä uudelleen." });
    },
  });

  const isCompleted = workout?.status === "completed" || localScheduledWorkout?.status === "completed";

  // All confirmed set_logs for this workout — gates the complete button.
  const localSets = useLocalSetLogs(workoutLogId);
  const deletedSetIds = useDeletedSetIds(workoutLogId);
  const { data: serverLoggedSets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("id, workout_log_id, exercise_id, program_exercise_id, set_number, weight, reps, rpe, is_pr, estimated_1rm, updated_at")
        .eq("workout_log_id", workoutLogId!);
      if (error) throw error;
      if (data) await hydrateSetLogs(data);
      return data ?? [];
    },
  });
  const loggedSets = useMemo(
    () => mergeById(serverLoggedSets, localSets ?? []).filter((s) => !deletedSetIds.has(s.id)),
    [serverLoggedSets, localSets, deletedSetIds],
  );

  if (!workout) {
    // Still loading vs definitively missing. Missing usually means the
    // workout id was cached from another user (stale offline cache) or
    // the row was deleted server-side. Don't try to render the logger
    // shell — just say so.
    if (workoutError || !workoutLoading) {
      return (
        <div className="client-app" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, opacity: 0.4, marginBottom: 12 }}>🏋️</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Treeniä ei löytynyt</h2>
          <p style={{ fontSize: 13, color: "var(--c-text-muted)", maxWidth: 280, margin: "0 auto 20px", lineHeight: 1.5 }}>
            Tämä treeni ei ole enää käytettävissä. Mene takaisin etusivulle ja avaa
            ohjelma uudelleen.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/client/dashboard")}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--r-md)",
              background: "var(--c-pink)",
              color: "var(--c-pink-fg, #fff)",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Takaisin etusivulle
          </button>
        </div>
      );
    }
    return (
      <div className="client-app" style={{ padding: "20px 16px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 90, borderRadius: "var(--r-lg)", background: "var(--c-surface)", marginBottom: 12, opacity: 0.4 }} />
        ))}
      </div>
    );
  }

  const day = workout.program_days;
  const exercises = (day?.program_exercises ?? []).slice().sort((a: any, b: any) => a.order_idx - b.order_idx);

  const setCountByPe = new Map<string, number>();
  for (const s of loggedSets) {
    const id = s.program_exercise_id as string | null;
    if (id) setCountByPe.set(id, (setCountByPe.get(id) ?? 0) + 1);
  }
  const targetsByPe = exercises.map((pe: any) => {
    const kind = pe.exercises?.kind ?? "lifting";
    const target =
      kind === "free"
        ? 1
        : kind === "cardio"
          ? (pe.sets ?? 1)
          : (pe.set_configs?.length ?? pe.sets ?? 3);
    const done = setCountByPe.get(pe.id) ?? 0;
    return { id: pe.id, target, done, name: pe.exercises?.name ?? "Harjoitus" };
  });
  const pendingExercises = targetsByPe.filter((t: { done: number; target: number }) => t.done < t.target);
  const allSetsConfirmed = pendingExercises.length === 0 && exercises.length > 0;

  if (showCelebration) {
    const dayName = workout?.program_days?.name ?? "Treeni";
    return (
      <div className="client-app" style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px 24px", textAlign: "center",
      }}>
        <style>{`
          @keyframes trophy-pop {
            0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
            60%  { transform: scale(1.25) rotate(8deg); opacity: 1; }
            80%  { transform: scale(0.92) rotate(-4deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes celebrate-fade-up {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes ring-pulse {
            0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-success) 50%, transparent); }
            50%       { box-shadow: 0 0 0 18px color-mix(in srgb, var(--c-success) 0%, transparent); }
          }
        `}</style>

        {/* Heading */}
        <div style={{
          fontSize: 30, fontWeight: 900, letterSpacing: "-0.6px", marginBottom: 8,
          animation: "celebrate-fade-up 0.4s ease both 0.3s",
          opacity: 0,
        }}>
          Hyvin tehty!
        </div>

        {/* Workout name */}
        <div style={{
          fontSize: 15, color: "var(--c-text-muted)", marginBottom: 8, fontWeight: 600,
          animation: "celebrate-fade-up 0.4s ease both 0.45s",
          opacity: 0,
        }}>
          {dayName} suoritettu ✓
        </div>

        {/* Sub-text */}
        <div style={{
          fontSize: 13, color: "var(--c-text-subtle)", marginBottom: 40,
          lineHeight: 1.65, maxWidth: 260,
          animation: "celebrate-fade-up 0.4s ease both 0.55s",
          opacity: 0,
        }}>
          Jokainen treeni vie sinut lähemmäs tavoitettasi. Nyt ansaitset levon.
        </div>

        {/* CTA */}
        <div style={{
          width: "100%", maxWidth: 320,
          animation: "celebrate-fade-up 0.4s ease both 0.65s",
          opacity: 0,
        }}>
          <button
            onClick={() => router.push("/client/dashboard")}
            style={{
              width: "100%", padding: "16px",
              borderRadius: "var(--r-lg)", border: "none",
              background: "var(--c-green)",
              color: "#fff", fontSize: 16, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              animation: "ring-pulse 2s ease-in-out 1.2s infinite",
              letterSpacing: "-0.2px",
            }}
          >
            Jatka →
          </button>
          <button
            onClick={() => setShowCelebration(false)}
            style={{
              width: "100%", marginTop: 12, padding: "13px",
              borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)",
              background: "transparent",
              color: "var(--c-text-muted)", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Muokkaa sarjoja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-app">
      <div style={{ padding: "20px 14px 32px" }}>
      {/* Header — day name is rendered by the shell (large→compact title handoff) */}
      {(day?.program_weeks || day?.description) && (
        <div style={{ marginBottom: 18 }}>
          {day?.program_weeks && (
            <div style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
              Viikko {day.program_weeks.week_number}
            </div>
          )}
          {day?.description && (
            <div style={{ fontSize: 13, color: "var(--c-text-muted)", fontStyle: "italic", marginTop: 8, lineHeight: 1.5 }}>
              {day.description}
            </div>
          )}
        </div>
      )}

      {isCompleted && (
        <div style={{
          background: "color-mix(in srgb, var(--c-success) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--c-success) 35%, transparent)",
          borderRadius: "var(--r-lg)",
          padding: "12px 16px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-success)" }}>
            Treeni merkitty valmiiksi
            {workout.completed_at && (
              <span style={{ fontWeight: 400, color: "var(--c-text-muted)", marginLeft: 6 }}>
                {new Date(workout.completed_at).toLocaleDateString("fi-FI")}
              </span>
            )}
            <span style={{ fontWeight: 400, color: "var(--c-text-muted)", marginLeft: 6, fontSize: 12 }}>
              — voit muokata sarjoja
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exercises.map((pe: any) => (
          <ExerciseBlock
            key={pe.id}
            programExercise={pe}
            workoutLogId={workoutLogId}
            clientId={workout.client_id}
          />
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
          style={{
            width: "100%", resize: "none",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)",
            padding: "12px 14px", fontSize: 14, color: "var(--c-text)",
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Complete button — hidden once completed */}
      {!isCompleted && (
        <>
          <button
            onClick={() => complete.mutate()}
            disabled={complete.isPending || !allSetsConfirmed}
            title={!allSetsConfirmed ? "Merkitse kaikki sarjat tehdyksi ensin" : undefined}
            style={{
              marginTop: 20, width: "100%", padding: "15px", borderRadius: "var(--r-lg)",
              background: allSetsConfirmed ? "var(--c-green)" : "var(--c-surface2)",
              border: allSetsConfirmed ? "none" : "1px solid var(--c-border)",
              color: allSetsConfirmed ? "#fff" : "var(--c-text-muted)",
              fontSize: 15, fontWeight: 700,
              cursor: complete.isPending || !allSetsConfirmed ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: allSetsConfirmed ? "0 0 24px color-mix(in srgb, var(--c-success) 30%, transparent)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: complete.isPending ? 0.6 : 1, transition: "all 0.2s",
            }}
          >
            <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none"
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
    </div>
  );
}

// ── Row state ─────────────────────────────────────────────────────────────────
type RowState = {
  weight: string;
  reps: string;
  rpeIdx: number;   // index into RPE_STEPS, -1 = not picked
  confirmed: boolean;
  setLogId: string | null;
  isPr: boolean;
  synced: boolean;
  // Original program target for this row — used to decide whether a value
  // has been touched by the user, so confirm-row carry-forward can skip
  // user-edited rows and rows whose programmed target differs.
  initialWeight: string;
  initialReps: string;
};

type SetConfig = { reps: string | null; weight: number | null; rpe: number | null };

function resolveInitialRows(pe: any): RowState[] {
  const cfgs: SetConfig[] | null = pe.set_configs ?? null;
  if (cfgs && cfgs.length > 0) {
    return cfgs.map((c) => {
      const weight = c.weight != null ? String(c.weight) : (pe.intensity != null ? String(pe.intensity) : "");
      const reps = c.reps ?? pe.reps ?? "";
      return {
        weight,
        reps,
        rpeIdx: targetRpeIdx(c.rpe ?? null),
        confirmed: false,
        setLogId: null,
        isPr: false,
        synced: true,
        initialWeight: weight,
        initialReps: reps,
      };
    });
  }
  const sets: number = pe.sets ?? 3;
  const perSetRpe: (number | null)[] | null = pe.target_rpes ?? null;
  return Array.from({ length: sets }, (_, i) => {
    const weight = pe.intensity != null ? String(pe.intensity) : "";
    const reps = pe.reps ?? "";
    return {
      weight,
      reps,
      rpeIdx: targetRpeIdx(perSetRpe ? (perSetRpe[i] ?? null) : (pe.target_rpe ?? null)),
      confirmed: false,
      setLogId: null,
      isPr: false,
      synced: true,
      initialWeight: weight,
      initialReps: reps,
    };
  });
}

// ── Exercise block dispatcher ─────────────────────────────────────────────────
function ExerciseBlock({ programExercise, workoutLogId, clientId }: { programExercise: any; workoutLogId: string | null; clientId: string }) {
  const kind: string = programExercise.exercises?.kind ?? "lifting";
  if (kind === "free") {
    return <FreeExerciseBlock programExercise={programExercise} workoutLogId={workoutLogId} />;
  }
  if (kind === "cardio") {
    return <CardioExerciseBlock programExercise={programExercise} workoutLogId={workoutLogId} />;
  }
  return <LiftingExerciseBlock programExercise={programExercise} workoutLogId={workoutLogId} clientId={clientId} />;
}

// ── Lifting block (original ExerciseBlock) ────────────────────────────────────
function LiftingExerciseBlock({ programExercise, workoutLogId, clientId }: { programExercise: any; workoutLogId: string | null; clientId: string }) {
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
      const trimmed = text.trim();
      if (!trimmed) {
        await supabase
          .from("workout_exercise_notes")
          .delete()
          .eq("workout_log_id", workoutLogId)
          .eq("program_exercise_id", programExercise.id);
      } else {
        await supabase
          .from("workout_exercise_notes")
          .upsert(
            { workout_log_id: workoutLogId, program_exercise_id: programExercise.id, notes: trimmed },
            { onConflict: "workout_log_id,program_exercise_id" },
          );
      }
    },
  });

  // ── Edellinen suoritus -hint: viime kerran painot per toistomäärä ──
  const exerciseId: string | null = programExercise.exercise_id ?? null;
  const { data: lastByReps } = useQuery({
    queryKey: ["last-by-reps", clientId, exerciseId],
    queryFn: () => getLastSetsByReps(supabase, clientId, exerciseId!),
    enabled: !!clientId && !!exerciseId,
    staleTime: 60_000,
  });

  // Apply suggestion: kun lastByReps latautuu, jos rivin reps täsmää aiempaan
  // suoritukseen ja painoa ei ole muokattu (weight === initialWeight) → täytä
  // weight viime kerran painolla. Säilytä initialWeight (ohjelman target)
  // ennallaan, jotta carry-forward-logiikka tunnistaa silti "mirroroitumisen"
  // toistomäärien välillä.
  const appliedHintRef = useRef(false);
  useEffect(() => {
    if (!lastByReps || appliedHintRef.current) return;
    appliedHintRef.current = true;
    setRows((prev) => prev.map((r) => {
      if (r.confirmed || r.setLogId) return r;
      const repsNum = r.reps ? parseInt(r.reps, 10) : null;
      if (repsNum === null || Number.isNaN(repsNum)) return r;
      if (r.weight !== r.initialWeight) return r;
      const hint = lastByReps.get(repsNum);
      if (!hint) return r;
      return { ...r, weight: String(hint.weight) };
    }));
  }, [lastByReps]);

  const { sets: localSets, deletedIds } = useLocalSetLogsAndDeleted(workoutLogId);
  const { data: serverSets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId, programExercise.id],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs").select("id, workout_log_id, exercise_id, program_exercise_id, set_number, weight, reps, rpe, is_pr, estimated_1rm, updated_at")
        .eq("workout_log_id", workoutLogId!)
        .eq("program_exercise_id", programExercise.id)
        .order("set_number");
      if (error) throw error;
      if (data) await hydrateSetLogs(data);
      return data ?? [];
    },
  });
  const sets = useMemo(() => {
    const localForExercise = localSets.filter((s) => s.program_exercise_id === programExercise.id);
    return mergeById(serverSets, localForExercise)
      .filter((s) => !deletedIds.has(s.id))
      .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
  }, [serverSets, localSets, deletedIds, programExercise.id]);

  const syncedById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const l of localSets) map.set(l.id, l.synced === 1);
    return map;
  }, [localSets]);

  useEffect(() => {
    setRows((prev) => prev.map((r, i) => {
      const setNumber = i + 1;
      const match = sets.find((s) => s.set_number === setNumber);
      if (!match) {
        if (!r.confirmed && r.setLogId === null) return r;
        return { ...r, confirmed: false, setLogId: null, isPr: false, synced: true };
      }
      const dbRpeIdx = match.rpe === null
        ? -1
        : (RPE_STEPS as readonly number[]).indexOf(match.rpe as number);
      const synced = syncedById.has(match.id) ? syncedById.get(match.id)! : true;
      return {
        ...r,
        weight: match.weight != null ? String(match.weight) : r.weight,
        reps: match.reps != null ? String(match.reps) : r.reps,
        rpeIdx: dbRpeIdx >= 0 ? dbRpeIdx : r.rpeIdx,
        confirmed: true,
        setLogId: match.id,
        isPr: !!match.is_pr,
        synced,
      };
    }));
  }, [sets, syncedById]);

  // Tracks rows where the user hit unconfirm while add was still in-flight,
  // so add.onSuccess doesn't re-confirm them.
  const cancelledRef = useRef(new Set<number>());

  const add = useMutation({
    mutationFn: async ({ rowIdx, row }: { rowIdx: number; row: RowState }) => {
      if (!workoutLogId) throw new Error("no workout log");
      const setNumber = rowIdx + 1;
      const rpe: number | null = row.rpeIdx >= 0 ? RPE_STEPS[row.rpeIdx] ?? null : null;
      const inserted = await logSet({
        workout_log_id: workoutLogId,
        exercise_id: programExercise.exercise_id,
        program_exercise_id: programExercise.id,
        set_number: setNumber,
        weight: row.weight ? Number(row.weight) : null,
        reps: row.reps ? Number(row.reps) : null,
        rpe,
      });
      return { rowIdx, id: inserted.id };
    },
    onSuccess: ({ rowIdx, id }) => {
      if (cancelledRef.current.has(rowIdx)) {
        cancelledRef.current.delete(rowIdx);
        return;
      }
      setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, confirmed: true, setLogId: id } : r));
      qc.invalidateQueries({ queryKey: ["set_logs"] });
    },
    onError: (e: any, { rowIdx }) => {
      cancelledRef.current.delete(rowIdx);
      setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, confirmed: false } : r));
      toast({ title: "Sarjan tallennus epäonnistui", description: e?.message ?? "Yritä uudelleen." });
    },
  });

  const unconfirm = useMutation({
    mutationFn: async (rowIdx: number) => {
      const row = rows[rowIdx];
      // First try the confirmed row's cached id.
      let id = row?.setLogId ?? null;

      if (!id && workoutLogId) {
        // Closure is stale — query Dexie directly for the freshest data.
        const setNumber = rowIdx + 1;
        const fresh = await getDB()
          .set_logs.where("workout_log_id").equals(workoutLogId)
          .filter(
            (s) =>
              s.set_number === setNumber &&
              s.program_exercise_id === programExercise.id &&
              s.deleted !== 1,
          )
          .first();
        id = fresh?.id ?? null;
      }

      if (!id || !workoutLogId) return;
      cancelledRef.current.add(rowIdx);
      await deleteSet(id, workoutLogId);
    },
    onSuccess: (_d, rowIdx) => {
      setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, confirmed: false, setLogId: null, isPr: false, synced: true } : r));
    },
    onError: (_e, rowIdx) => {
      cancelledRef.current.delete(rowIdx);
    },
  });

  function confirmRow(i: number) {
    const row = rows[i];
    if (!row || row.confirmed) return;
    cancelledRef.current.delete(i);
    // Carry the just-confirmed weight/reps forward to subsequent unconfirmed
    // rows — but only if the next row hasn't been edited (still matches its
    // own program target) AND the two rows were programmed to mirror each
    // other (same initial target). Skips per-set varying schemes like 8/6/4
    // reps where each row was meant to differ.
    setRows((prev) => prev.map((r, idx) => {
      if (idx === i) return { ...r, confirmed: true };
      if (idx > i && !r.confirmed) {
        const untouchedW = r.weight === r.initialWeight;
        const untouchedR = r.reps === r.initialReps;
        const mirroredW = row.initialWeight === r.initialWeight;
        const mirroredR = row.initialReps === r.initialReps;
        return {
          ...r,
          weight: untouchedW && mirroredW ? row.weight : r.weight,
          reps: untouchedR && mirroredR ? row.reps : r.reps,
        };
      }
      return r;
    }));
    add.mutate({ rowIdx: i, row });
  }

  function updateRow(i: number, patch: Partial<RowState>) {
    const cur = rows[i];
    if (cur?.confirmed) {
      // Auto-unconfirm: value changed on a saved set — delete it and mark editable.
      const id = cur.setLogId;
      if (id && workoutLogId) {
        cancelledRef.current.add(i);
        void deleteSet(id, workoutLogId).catch(() => {});
      }
      setRows((prev) => prev.map((r, idx) =>
        idx === i ? { ...r, ...patch, confirmed: false, setLogId: null, isPr: false, synced: true } : r
      ));
    } else {
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    }
  }

  const confirmedCount = rows.filter((r) => r.confirmed).length;
  const allDone = confirmedCount === targetSets;

  // Active set = first incomplete. Highlighted in-place; no row re-ordering.
  const firstOpenIdx = rows.findIndex((r) => !r.confirmed);

  // Resolve per-set target list for the header summary. Labels stay fixed;
  // only styling of the active row changes.
  const headerCfgs: SetConfig[] = (() => {
    const cfgs: SetConfig[] | null = programExercise.set_configs?.length > 0 ? programExercise.set_configs : null;
    if (cfgs) return cfgs;
    const rpeVals: (number | null)[] = programExercise.target_rpes
      ?? (programExercise.target_rpe != null ? Array(targetSets).fill(programExercise.target_rpe) : Array(targetSets).fill(null));
    return Array.from({ length: targetSets }, (_, i) => ({
      reps: programExercise.reps ?? null,
      weight: programExercise.intensity ?? null,
      rpe: rpeVals[i] ?? null,
    }));
  })();

  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1px solid ${allDone ? "color-mix(in srgb, var(--c-success) 25%, transparent)" : "var(--c-border)"}`,
      borderRadius: "var(--r-xl)",
      overflow: "hidden",
    }}>
      {/* ── Card header ── */}
      <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Progress circle */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${allDone ? "var(--c-success)" : "var(--c-border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: allDone ? "color-mix(in srgb, var(--c-success) 12%, transparent)" : "var(--c-surface2)",
          transition: "all 0.2s",
        }}>
          {allDone
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)" }}>{confirmedCount}/{targetSets}</span>
          }
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {programExercise.exercises?.name ?? "Harjoitus"}
            </div>
            {(programExercise.exercises?.instructions || programExercise.exercises?.video_path) && (
              <ExerciseInfoDialog
                exercises={[{
                  name: programExercise.exercises?.name ?? "Harjoitus",
                  instructions: programExercise.exercises?.instructions ?? null,
                  video_path: programExercise.exercises?.video_path ?? null,
                }]}
                trigger={
                  <button
                    type="button"
                    title="Katso harjoitteen kuvaus"
                    style={{
                      flexShrink: 0, width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--c-border)",
                      background: "var(--c-surface2)",
                      color: "var(--c-text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      fontSize: 13, fontWeight: 700,
                      transition: "all 0.15s",
                    }}
                  >
                    ?
                  </button>
                }
              />
            )}
            {(() => {
              const idx = firstOpenIdx >= 0 ? firstOpenIdx : rows.length - 1;
              const rawW = rows[idx]?.weight;
              const parsed = rawW && rawW.trim() !== "" ? parseFloat(rawW) : NaN;
              const w = Number.isFinite(parsed) ? parsed : (headerCfgs[idx]?.weight ?? null);
              return (
                <PlateLoaderDialog
                  exerciseName={programExercise.exercises?.name ?? "Harjoitus"}
                  nextSetNumber={idx + 1}
                  nextSetWeight={w}
                  trigger={
                    <button
                      type="button"
                      title="Laske levyt"
                      style={{
                        flexShrink: 0, height: 30, padding: "0 10px",
                        borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)",
                        background: "var(--c-surface2)",
                        color: "var(--c-text-muted)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: 11, fontWeight: 700,
                        transition: "all 0.15s",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="6" width="3" height="12" rx="0.5" />
                        <rect x="8" y="3" width="4" height="18" rx="0.5" />
                        <rect x="14" y="9" width="7" height="6" rx="0.5" />
                      </svg>
                      Levyt
                    </button>
                  }
                />
              );
            })()}
            {exerciseId && clientId && (
              <ExerciseHistoryDialog
                exerciseName={programExercise.exercises?.name ?? "Harjoitus"}
                exerciseId={exerciseId}
                clientId={clientId}
                trigger={
                  <button
                    type="button"
                    title="Liikkeen historia"
                    style={{
                      flexShrink: 0, height: 30, padding: "0 10px",
                      borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)",
                      background: "var(--c-surface2)",
                      color: "var(--c-text-muted)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                      cursor: "pointer", fontFamily: "inherit",
                      fontSize: 11, fontWeight: 700,
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 7 12 12 15 14" />
                    </svg>
                    Historia
                  </button>
                }
              />
            )}
            <button
              type="button"
              onClick={() => { setNoteOpen((o) => !o); }}
              title="Lisää muistiinpano"
              style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--c-border)",
                background: noteOpen ? "color-mix(in srgb, var(--c-pink) 10%, transparent)" : "var(--c-surface2)",
                color: noteOpen ? "var(--c-pink)" : "var(--c-text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Static per-set target list. Active row highlighted in place. */}
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            {headerCfgs.map((c, i) => {
              const repsLbl = c.reps ? `${c.reps} toistoa` : "— toistoa";
              const weightLbl = c.weight != null ? `, ${c.weight} kg` : "";
              const rpeLbl = c.rpe != null ? `, rpe ${c.rpe === 5 ? "<6" : c.rpe}` : "";
              const isActive = i === firstOpenIdx;
              const isDone = rows[i]?.confirmed ?? false;
              return (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--c-pink)" : isDone ? "var(--c-text-subtle)" : "var(--c-text-muted)",
                  textDecoration: isDone ? "line-through" : "none",
                  letterSpacing: isActive ? "-0.1px" : 0,
                }}>
                  <span style={{
                    display: "inline-block",
                    width: 6, height: 6, borderRadius: "50%",
                    background: isActive ? "var(--c-pink)" : "transparent",
                    boxShadow: isActive ? "0 0 8px var(--c-pink-glow)" : "none",
                    flexShrink: 0,
                  }} />
                  <span>sarja {i + 1}: {repsLbl}{weightLbl}{rpeLbl}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ paddingBottom: 4 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "16px minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) clamp(34px, 9vw, 44px)",
          gap: 2, padding: "0 clamp(4px, 1.5vw, 8px) 6px",
          borderBottom: "1px solid var(--c-border)",
        }}>
          <span style={{ fontSize: 10, color: "var(--c-text-subtle)", fontWeight: 600 }}>#</span>
          <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600, textAlign: "center" }}>Paino (kg)</span>
          <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600, textAlign: "center" }}>Toistot</span>
          <span style={{ fontSize: 10, color: "var(--c-pink)", fontWeight: 600, textAlign: "center" }}>RPE</span>
          <span />
        </div>

        {rows.map((row, i) => (
          <SetTableRow
            key={i}
            rowNum={i + 1}
            row={row}
            onChange={(patch) => updateRow(i, patch)}
            onConfirm={() => confirmRow(i)}
            onUnconfirm={() => unconfirm.mutate(i)}
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
              border: "1px solid var(--c-border)", borderRadius: "var(--r-md)",
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
  rawValue?: string;
  onRawChange?: (v: string) => void;
  inputMode?: "decimal" | "numeric";
  inputStep?: string;
}) {
  function btn(active: boolean, onClick: () => void, kind: "plus" | "minus") {
    const stroke = (!active || disabled) ? "var(--c-text-subtle)" : "var(--c-text)";
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!active || disabled}
        aria-label={kind === "plus" ? "Lisää" : "Vähennä"}
        style={{
          width: "clamp(26px, 7vw, 32px)", height: "clamp(26px, 7vw, 32px)",
          borderRadius: "50%", flexShrink: 0,
          background: (!active || disabled) ? "transparent" : "var(--c-surface3)",
          border: `1px solid ${(!active || disabled) ? "transparent" : "var(--c-border)"}`,
          cursor: (!active || disabled) ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
          transition: "background 0.1s",
        }}
      >
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none"
          stroke={stroke} strokeWidth="3" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          {kind === "plus" && <line x1="12" y1="5" x2="12" y2="19" />}
        </svg>
      </button>
    );
  }

  const centerStyle: React.CSSProperties = {
    flex: 1, textAlign: "center", lineHeight: 1,
    fontSize: "clamp(14px, 3.8vw, 16px)", fontWeight: 700,
    color: display === "–" ? "var(--c-text-subtle)" : "var(--c-text)",
    background: disabled ? "transparent" : "var(--c-surface2)",
    border: `1px solid ${disabled ? "transparent" : "var(--c-border)"}`,
    borderRadius: "var(--r-sm)", padding: "9px 0",
    minWidth: 0, outline: "none",
    fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
    overflow: "hidden",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      {btn(canDec, onDec, "minus")}
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
      {btn(canInc, onInc, "plus")}
    </div>
  );
}

// ── Set table row ─────────────────────────────────────────────────────────────
function SetTableRow({
  rowNum, row, onChange, onConfirm, onUnconfirm,
}: {
  rowNum: number;
  row: RowState;
  onChange: (patch: Partial<RowState>) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
}) {
  const inputsDisabled = false;
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

  const repsNum = row.reps !== "" ? parseInt(row.reps, 10) : null;
  function decReps() {
    if (repsNum === null || repsNum <= 1) return;
    onChange({ reps: String(repsNum - 1) });
  }
  function incReps() {
    if (repsNum === null) { onChange({ reps: "1" }); return; }
    onChange({ reps: String(repsNum + 1) });
  }

  const currentRpe = row.rpeIdx >= 0 ? RPE_STEPS[row.rpeIdx] : undefined;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "16px minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) clamp(40px, 11vw, 50px)",
      gap: 2, padding: "8px clamp(4px, 1.5vw, 8px)",
      borderBottom: "1px solid var(--c-border)",
      background: row.isPr ? "color-mix(in srgb, var(--c-warning) 5%, transparent)" : "transparent",
      opacity: row.confirmed ? 0.7 : 1,
      transition: "opacity 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: row.isPr ? "var(--c-warning)" : "var(--c-text-subtle)" }}>
          {row.isPr ? "PR" : rowNum}
        </span>
      </div>

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

      <StepperCell
        display={currentRpe !== undefined ? rpeLabel(currentRpe) : "–"}
        disabled={inputsDisabled}
        canDec={row.rpeIdx > 0}
        canInc={row.rpeIdx < RPE_STEPS.length - 1}
        onDec={() => onChange({ rpeIdx: Math.max(0, row.rpeIdx - 1) })}
        onInc={() => onChange({ rpeIdx: row.rpeIdx < 0 ? 0 : Math.min(RPE_STEPS.length - 1, row.rpeIdx + 1) })}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <button
          type="button"
          onClick={row.confirmed ? onUnconfirm : onConfirm}
          title={row.confirmed ? "Peru sarja" : "Merkitse tehdyksi"}
          style={{
            width: "clamp(40px, 11vw, 48px)", height: "clamp(40px, 11vw, 48px)",
            borderRadius: "50%", padding: 0, flexShrink: 0,
            background: row.confirmed ? "color-mix(in srgb, var(--c-success) 15%, transparent)" : "var(--c-pink-dim, rgba(236,72,153,0.10))",
            border: `1.5px solid ${row.confirmed && !row.synced ? "color-mix(in srgb, var(--c-warning) 40%, transparent)" : row.confirmed ? "color-mix(in srgb, var(--c-success) 40%, transparent)" : "var(--c-pink, rgba(236,72,153,0.5))"}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          } as React.CSSProperties}
        >
          {row.confirmed && !row.synced ? (
            <svg width="46%" height="46%" viewBox="0 0 24 24" fill="none"
              stroke="var(--c-warning)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
            </svg>
          ) : (
            <svg width="46%" height="46%" viewBox="0 0 24 24" fill="none"
              stroke={row.confirmed ? "var(--c-success)" : "var(--c-pink, #ec4899)"}
              strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Free-text exercise block ──────────────────────────────────────────────────
// For non-trackable workouts: coach writes a description (e.g. "10 min lämmittely,
// 4-8 min @ 4:00/km, 10 min verkka"), client reads it and toggles Tehty.
function FreeExerciseBlock({ programExercise, workoutLogId }: { programExercise: any; workoutLogId: string | null }) {
  const supabase = createClient();

  const { sets: localSets, deletedIds } = useLocalSetLogsAndDeleted(workoutLogId);
  const { data: serverSets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId, programExercise.id],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("id, workout_log_id, exercise_id, program_exercise_id, set_number, weight, reps, rpe, is_pr, estimated_1rm, updated_at")
        .eq("workout_log_id", workoutLogId!)
        .eq("program_exercise_id", programExercise.id);
      if (error) throw error;
      if (data) await hydrateSetLogs(data);
      return data ?? [];
    },
  });
  const merged = useMemo(
    () =>
      mergeById(
        serverSets,
        localSets.filter((s) => s.program_exercise_id === programExercise.id),
      ).filter((s) => !deletedIds.has(s.id)),
    [serverSets, localSets, deletedIds, programExercise.id],
  );
  const marker = merged[0] ?? null;
  const done = !!marker;
  const synced = marker ? localSets.find((l) => l.id === marker.id)?.synced !== 0 : true;
  const description: string = (programExercise.free_text || programExercise.notes) ?? "";
  const exerciseName = programExercise.exercises?.name ?? "Harjoitus";

  async function toggle() {
    if (!workoutLogId || !programExercise.exercise_id) return;
    if (done && marker) {
      await deleteSet(marker.id, workoutLogId);
    } else {
      await logSet({
        workout_log_id: workoutLogId,
        program_exercise_id: programExercise.id,
        exercise_id: programExercise.exercise_id,
        set_number: 1,
        weight: null,
        reps: null,
        rpe: null,
      });
    }
  }

  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1px solid ${done ? "color-mix(in srgb, var(--c-success) 25%, transparent)" : "var(--c-border)"}`,
      borderRadius: "var(--r-xl)", overflow: "hidden", padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: description ? 10 : 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${done ? "var(--c-success)" : "var(--c-border)"}`,
          background: done ? "color-mix(in srgb, var(--c-success) 12%, transparent)" : "var(--c-surface2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {done ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {exerciseName}
          </div>
          {!description && (
            <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>
              Vapaa harjoitus
            </div>
          )}
        </div>
        {done && (
          <SyncBadge synced={synced} size={11} />
        )}
      </div>

      {description && (
        <div style={{
          background: "var(--c-surface2)", border: "1px solid var(--c-border)",
          borderRadius: "var(--r-md)", padding: "10px 12px", marginBottom: 12,
          fontSize: 13, color: "var(--c-text)", lineHeight: 1.55, whiteSpace: "pre-wrap",
        }}>
          {description}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        style={{
          width: "100%", padding: "12px",
          borderRadius: "var(--r-md)",
          background: done ? "color-mix(in srgb, var(--c-success) 10%, transparent)" : "var(--c-surface2)",
          border: `1px solid ${done ? "color-mix(in srgb, var(--c-success) 40%, transparent)" : "var(--c-border)"}`,
          color: done ? "var(--c-green)" : "var(--c-text)",
          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {done ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tehty — peru
          </>
        ) : (
          "Merkitse tehdyksi"
        )}
      </button>
    </div>
  );
}

// ── Cardio block ──────────────────────────────────────────────────────────────
function parseDurationStr(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.length === 1) return nums[0]!;
  if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
  if (nums.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  return null;
}
function formatDurationSec(s: number | null | undefined): string {
  if (s == null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type CardioRowState = {
  distance: string;  // km
  duration: string;  // mm:ss or h:mm:ss
  hr: string;        // bpm
  confirmed: boolean;
  setLogId: string | null;
  synced: boolean;
};

function CardioExerciseBlock({ programExercise, workoutLogId }: { programExercise: any; workoutLogId: string | null }) {
  const supabase = createClient();
  const ex = programExercise.exercises ?? {};
  const tracks = {
    distance: !!ex.tracks_distance,
    duration: !!ex.tracks_duration,
    hr: !!ex.tracks_hr,
  };
  const trackedCount = (tracks.distance ? 1 : 0) + (tracks.duration ? 1 : 0) + (tracks.hr ? 1 : 0);
  const targetSets: number = programExercise.sets ?? 1;
  const exerciseName = ex.name ?? "Harjoitus";

  // Format target into a single line
  const targetParts: string[] = [];
  if (programExercise.target_distance_m != null) {
    targetParts.push(`${(programExercise.target_distance_m / 1000).toFixed(2).replace(/\.?0+$/, "")} km`);
  }
  if (programExercise.target_duration_s != null) {
    targetParts.push(formatDurationSec(programExercise.target_duration_s));
  }
  if (programExercise.target_hr_bpm != null) {
    targetParts.push(`${programExercise.target_hr_bpm} bpm`);
  }
  const targetLine = targetParts.join(" · ");

  const [rows, setRows] = useState<CardioRowState[]>(() =>
    Array.from({ length: targetSets }, () => ({
      distance: "", duration: "", hr: "",
      confirmed: false, setLogId: null, synced: true,
    })),
  );

  const { sets: localSets, deletedIds } = useLocalSetLogsAndDeleted(workoutLogId);
  const { data: serverSets = [] } = useQuery({
    queryKey: ["set_logs", workoutLogId, programExercise.id],
    enabled: !!workoutLogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("id, workout_log_id, exercise_id, program_exercise_id, set_number, weight, reps, rpe, is_pr, estimated_1rm, updated_at, distance_m, duration_s, avg_hr")
        .eq("workout_log_id", workoutLogId!)
        .eq("program_exercise_id", programExercise.id)
        .order("set_number");
      if (error) throw error;
      if (data) await hydrateSetLogs(data);
      return data ?? [];
    },
  });
  const sets = useMemo(() => {
    const localForEx = localSets.filter((s) => s.program_exercise_id === programExercise.id);
    return mergeById(serverSets, localForEx)
      .filter((s: any) => !deletedIds.has(s.id))
      .sort((a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0));
  }, [serverSets, localSets, deletedIds, programExercise.id]);

  useEffect(() => {
    setRows((prev) => prev.map((r, i) => {
      const match = sets.find((s: any) => s.set_number === i + 1);
      if (!match) {
        if (!r.confirmed && r.setLogId === null) return r;
        return { ...r, confirmed: false, setLogId: null, synced: true };
      }
      const isSynced = localSets.find((l) => l.id === match.id)?.synced !== 0;
      return {
        ...r,
        distance: (match as any).distance_m != null ? ((match as any).distance_m / 1000).toString() : r.distance,
        duration: (match as any).duration_s != null ? formatDurationSec((match as any).duration_s) : r.duration,
        hr: (match as any).avg_hr != null ? String((match as any).avg_hr) : r.hr,
        confirmed: true,
        setLogId: match.id,
        synced: isSynced,
      };
    }));
  }, [sets, localSets]);

  const confirmedCount = rows.filter((r) => r.confirmed).length;
  const allDone = confirmedCount === targetSets;

  async function confirmRow(i: number) {
    if (!workoutLogId || !programExercise.exercise_id) return;
    const row = rows[i];
    if (!row || row.confirmed) return;
    const distance_m = row.distance.trim() && tracks.distance
      ? Math.round(parseFloat(row.distance.replace(",", ".")) * 1000)
      : null;
    const duration_s = tracks.duration ? parseDurationStr(row.duration) : null;
    const hr = row.hr.trim() && tracks.hr ? parseInt(row.hr, 10) : null;
    await logSet({
      workout_log_id: workoutLogId,
      program_exercise_id: programExercise.id,
      exercise_id: programExercise.exercise_id,
      set_number: i + 1,
      weight: null,
      reps: null,
      rpe: null,
      distance_m: Number.isFinite(distance_m as number) ? distance_m : null,
      duration_s: Number.isFinite(duration_s as number) ? duration_s : null,
      avg_hr: Number.isFinite(hr as number) ? hr : null,
    });
  }

  async function unconfirmRow(i: number) {
    const row = rows[i];
    if (!row?.setLogId || !workoutLogId) return;
    await deleteSet(row.setLogId, workoutLogId);
  }

  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1px solid ${allDone ? "color-mix(in srgb, var(--c-success) 25%, transparent)" : "var(--c-border)"}`,
      borderRadius: "var(--r-xl)", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${allDone ? "var(--c-success)" : "var(--c-border)"}`,
          background: allDone ? "color-mix(in srgb, var(--c-success) 12%, transparent)" : "var(--c-surface2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {allDone
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)" }}>{confirmedCount}/{targetSets}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {exerciseName}
          </div>
          {targetLine && (
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
              Tavoite: {targetLine}
            </div>
          )}
          {!targetLine && trackedCount > 0 && (
            <div style={{ fontSize: 11, color: "var(--c-text-subtle)", marginTop: 2 }}>
              Kardio · {targetSets} sarja{targetSets > 1 ? "a" : ""}
            </div>
          )}
        </div>
      </div>

      {trackedCount === 0 ? (
        <div style={{ padding: "12px 16px 16px", fontSize: 12, color: "var(--c-text-muted)" }}>
          Liikkeelle ei ole valittu seurattavia kenttiä. Coach: rastita matka / aika / syke liikepankissa.
        </div>
      ) : (
        <div style={{ padding: "0 8px 12px" }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `16px ${[tracks.distance, tracks.duration, tracks.hr].filter(Boolean).map(() => "minmax(0,1fr)").join(" ")} clamp(34px,9vw,44px)`,
            gap: 4, padding: "6px clamp(4px,1.5vw,8px) 4px",
            borderBottom: "1px solid var(--c-border)",
          }}>
            <span style={{ fontSize: 10, color: "var(--c-text-subtle)", fontWeight: 600 }}>#</span>
            {tracks.distance && <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600, textAlign: "center" }}>Matka (km)</span>}
            {tracks.duration && <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600, textAlign: "center" }}>Aika</span>}
            {tracks.hr && <span style={{ fontSize: 10, color: "var(--c-pink)", fontWeight: 600, textAlign: "center" }}>Syke</span>}
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: `16px ${[tracks.distance, tracks.duration, tracks.hr].filter(Boolean).map(() => "minmax(0,1fr)").join(" ")} clamp(34px,9vw,44px)`,
              gap: 4, padding: "8px clamp(4px,1.5vw,8px)",
              borderBottom: "1px solid var(--c-border)",
              opacity: row.confirmed ? 0.7 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--c-text-subtle)" }}>
                {i + 1}
              </div>
              {tracks.distance && (
                <input
                  type="number" inputMode="decimal" step="0.1"
                  placeholder="–"
                  value={row.distance}
                  onChange={(e) => setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, distance: e.target.value, confirmed: false, setLogId: null } : r))}
                  style={cardioInputStyle(row.confirmed)}
                />
              )}
              {tracks.duration && (
                <input
                  type="text" inputMode="numeric"
                  placeholder="hh:mm:ss"
                  value={row.duration}
                  onChange={(e) => setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, duration: e.target.value, confirmed: false, setLogId: null } : r))}
                  style={cardioInputStyle(row.confirmed)}
                />
              )}
              {tracks.hr && (
                <input
                  type="number" inputMode="numeric" step="1"
                  placeholder="bpm"
                  value={row.hr}
                  onChange={(e) => setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, hr: e.target.value, confirmed: false, setLogId: null } : r))}
                  style={cardioInputStyle(row.confirmed)}
                />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => row.confirmed ? unconfirmRow(i) : confirmRow(i)}
                  title={row.confirmed ? "Peru" : "Merkitse tehdyksi"}
                  style={{
                    width: "clamp(34px,9vw,40px)", height: "clamp(34px,9vw,40px)",
                    borderRadius: "50%", padding: 0, flexShrink: 0,
                    background: row.confirmed ? "color-mix(in srgb, var(--c-success) 15%, transparent)" : "var(--c-surface2)",
                    border: `1px solid ${row.confirmed ? "color-mix(in srgb, var(--c-success) 40%, transparent)" : "var(--c-border)"}`,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none"
                    stroke={row.confirmed ? "var(--c-success)" : "var(--c-text-subtle)"}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cardioInputStyle(confirmed: boolean): React.CSSProperties {
  return {
    width: "100%", minWidth: 0, boxSizing: "border-box",
    textAlign: "center", lineHeight: 1,
    fontSize: "clamp(11px,3.2vw,13px)", fontWeight: 700,
    color: "var(--c-text)",
    background: confirmed ? "transparent" : "var(--c-surface2)",
    border: `1px solid ${confirmed ? "transparent" : "var(--c-border)"}`,
    borderRadius: "var(--r-sm)", padding: "8px 4px",
    outline: "none", fontFamily: "inherit",
  };
}
