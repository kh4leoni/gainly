"use client";

import { useEffect, useRef, useState } from "react";
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
// null = "< 6", then 6, 6.5 … 10
const RPE_STEPS: (number | null)[] = [null, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function rpeLabel(v: number | null | undefined): string {
  if (v === undefined) return "–";
  if (v === null) return "<6";
  return String(v);
}

function targetRpeIdx(t: number | null): number {
  if (t === null) return 0;            // not set → default to <6
  if (t === 0) return 0;               // <6
  const i = RPE_STEPS.indexOf(t);
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

  useEffect(() => {
    if (!workout) return;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) return;
      const { data: existing } = await supabase
        .from("workout_logs").select("id")
        .eq("scheduled_workout_id", scheduledWorkoutId)
        .eq("client_id", me.user.id).maybeSingle();
      if (existing?.id) { setWorkoutLogId(existing.id); return; }
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

  const complete = useMutation({
    mutationFn: async () => {
      await enqueue("workout.complete", { scheduled_workout_id: scheduledWorkoutId });
      if (navigator.onLine) await replay();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout", scheduledWorkoutId] });
      toast({ title: "Treeni valmis! 🎉" });
    },
  });

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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: "var(--c-text-muted)", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "3px 10px" }}>
            ⏳ {pending} synkronoimatta
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exercises.map((pe: any) => (
          <ExerciseBlock key={pe.id} programExercise={pe} workoutLogId={workoutLogId} />
        ))}
        {exercises.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-text-muted)", fontSize: 14 }}>
            Ei harjoituksia tässä treeniä.
          </div>
        )}
      </div>

      {/* Complete */}
      <button
        onClick={() => complete.mutate()}
        disabled={complete.isPending}
        style={{
          marginTop: 20, width: "100%", padding: "15px", borderRadius: 14,
          background: "var(--c-green)", border: "none", color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 0 24px rgba(62,207,142,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: complete.isPending ? 0.6 : 1, transition: "opacity 0.15s",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        {complete.isPending ? "Tallennetaan..." : "Merkitse valmiiksi"}
      </button>
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

function makeRows(count: number, targetWeight: number | null, targetReps: string | null, tRpeIdx: number): RowState[] {
  return Array.from({ length: count }, () => ({
    weight: targetWeight != null ? String(targetWeight) : "",
    reps: targetReps ?? "",
    rpeIdx: tRpeIdx,
    confirmed: false,
    isPr: false,
  }));
}

// ── Exercise block ────────────────────────────────────────────────────────────
function ExerciseBlock({ programExercise, workoutLogId }: { programExercise: any; workoutLogId: string | null }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const targetSets: number = programExercise.sets ?? 3;
  const tRpeIdx = targetRpeIdx(programExercise.target_rpe ?? null);

  const [rows, setRows] = useState<RowState[]>(() =>
    makeRows(targetSets, programExercise.intensity ?? null, programExercise.reps ?? null, tRpeIdx)
  );
  const syncedRef = useRef(false);

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

  // Sync DB sets into row state once
  useEffect(() => {
    if (syncedRef.current || sets.length === 0) return;
    syncedRef.current = true;
    setRows((prev) =>
      prev.map((r, i) => {
        const s = sets[i] as any;
        if (!s) return r;
        const dbRpeIdx = s.rpe === null ? 0 : RPE_STEPS.indexOf(s.rpe as number);
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
      const rpe = row.rpeIdx >= 0 ? (RPE_STEPS[row.rpeIdx] ?? null) : null;
      await enqueue("set_log.create", {
        id, workout_log_id: workoutLogId,
        exercise_id: programExercise.exercise_id,
        program_exercise_id: programExercise.id,
        set_number: setNumber,
        weight: row.weight ? Number(row.weight) : null,
        reps: row.reps ? Number(row.reps) : null,
        rpe,
      }, id);
      if (navigator.onLine) await replay();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["set_logs", workoutLogId, programExercise.id] }),
  });

  function confirmRow(i: number) {
    const row = rows[i];
    if (!row || row.confirmed) return;
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, confirmed: true } : r));
    add.mutate({ rowIdx: i, row });
  }

  function updateRow(i: number, patch: Partial<RowState>) {
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
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {programExercise.exercises?.name ?? "Harjoitus"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
              {targetSets} × {programExercise.reps ?? "—"} toistoa
            </span>
            {programExercise.target_rpe != null && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: "rgba(255,29,140,0.15)", color: "var(--c-pink)", border: "1px solid rgba(255,29,140,0.3)",
              }}>
                @RPE {programExercise.target_rpe === 0 ? "<6" : programExercise.target_rpe}
              </span>
            )}
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
            onChange={(patch) => updateRow(i, patch)}
            onConfirm={() => confirmRow(i)}
          />
        ))}
      </div>

      {/* Notes */}
      {programExercise.notes && (
        <div style={{ padding: "8px 14px 12px", fontSize: 12, color: "var(--c-text-muted)", fontStyle: "italic", borderTop: "1px solid var(--c-border)" }}>
          {programExercise.notes}
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
  rowNum, row, onChange, onConfirm,
}: {
  rowNum: number;
  row: RowState;
  onChange: (patch: Partial<RowState>) => void;
  onConfirm: () => void;
}) {
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
        disabled={row.confirmed}
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
        disabled={row.confirmed}
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
        disabled={row.confirmed}
        canDec={row.rpeIdx > 0}
        canInc={row.rpeIdx < RPE_STEPS.length - 1}
        onDec={() => onChange({ rpeIdx: Math.max(0, row.rpeIdx - 1) })}
        onInc={() => onChange({ rpeIdx: row.rpeIdx < 0 ? 0 : Math.min(RPE_STEPS.length - 1, row.rpeIdx + 1) })}
      />

      {/* Confirm */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          type="button" onClick={onConfirm} disabled={row.confirmed}
          style={{
            width: 30, height: 30, borderRadius: "50%", padding: 0, flexShrink: 0,
            background: row.confirmed ? "rgba(62,207,142,0.15)" : "var(--c-surface2)",
            border: `1px solid ${row.confirmed ? "rgba(62,207,142,0.4)" : "var(--c-border)"}`,
            cursor: row.confirmed ? "default" : "pointer",
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
