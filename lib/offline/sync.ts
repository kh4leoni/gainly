"use client";

import { createClient } from "@/lib/supabase/client";
import { peek, remove, bumpError } from "./queue";
import type { PendingMutation } from "./db";

// Items that fail this many times are dropped so they can't block the queue forever.
const MAX_ATTEMPTS = 10;

let replayPromise: Promise<void> | null = null;

// Returns the in-progress replay promise if one is running, so callers can
// await the same run rather than bailing out silently.
export function replay(): Promise<void> {
  if (replayPromise) return replayPromise;
  replayPromise = doReplay().finally(() => { replayPromise = null; });
  return replayPromise;
}

async function doReplay() {
  const supabase = createClient();
  const items = await peek();
  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) {
      await remove(item.id);
      continue;
    }
    try {
      await execute(supabase, item);
      await remove(item.id);
    } catch (e: any) {
      await bumpError(item.id, e?.message ?? String(e));
      // Stop on first failure to preserve FIFO semantics for the same client.
      break;
    }
  }
}

async function execute(
  supabase: ReturnType<typeof createClient>,
  item: PendingMutation
) {
  switch (item.kind) {
    case "workout_log.create": {
      const p = item.payload as { id: string; client_id: string; scheduled_workout_id?: string };
      const { error } = await supabase.from("workout_logs").insert({
        id: p.id,
        client_id: p.client_id,
        scheduled_workout_id: p.scheduled_workout_id ?? null,
      });
      if (error && !isDuplicate(error)) throw error;
      return;
    }
    case "set_log.create": {
      const p = item.payload as {
        id: string;
        workout_log_id: string;
        exercise_id: string;
        program_exercise_id?: string | null;
        set_number?: number | null;
        weight?: number | null;
        reps?: number | null;
        rpe?: number | null;
      };
      const { error } = await supabase.from("set_logs").insert({
        id: p.id,
        workout_log_id: p.workout_log_id,
        exercise_id: p.exercise_id,
        program_exercise_id: p.program_exercise_id ?? null,
        set_number: p.set_number ?? null,
        weight: p.weight ?? null,
        reps: p.reps ?? null,
        rpe: p.rpe ?? null,
      });
      if (error && !isDuplicate(error)) throw error;
      return;
    }
    case "workout.complete": {
      const p = item.payload as { scheduled_workout_id: string };
      const { error } = await supabase
        .from("scheduled_workouts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", p.scheduled_workout_id);
      if (error) throw error;
      return;
    }
    case "message.send": {
      const p = item.payload as { id: string; thread_id: string; sender_id: string; content: string };
      const { error } = await supabase.from("messages").insert({
        id: p.id,
        thread_id: p.thread_id,
        sender_id: p.sender_id,
        content: p.content,
      });
      if (error && !isDuplicate(error)) throw error;
      return;
    }
    case "workout_log.update_notes": {
      const p = item.payload as { id: string; notes: string | null };
      const { error } = await supabase.from("workout_logs").update({ notes: p.notes }).eq("id", p.id);
      if (error) throw error;
      return;
    }
    case "exercise_note.upsert": {
      const p = item.payload as { workout_log_id: string; program_exercise_id: string; notes: string };
      const { error } = await supabase.from("workout_exercise_notes").upsert({
        workout_log_id: p.workout_log_id,
        program_exercise_id: p.program_exercise_id,
        notes: p.notes,
      });
      if (error && !isDuplicate(error)) throw error;
      return;
    }
    case "exercise_note.delete": {
      const p = item.payload as { workout_log_id: string; program_exercise_id: string };
      await supabase.from("workout_exercise_notes")
        .delete()
        .eq("workout_log_id", p.workout_log_id)
        .eq("program_exercise_id", p.program_exercise_id);
      return;
    }
  }
}

function isDuplicate(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

// Register listeners once per page session.
export function installSyncListeners() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", replay);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void replay();
  });
  // Kick once on load.
  if (navigator.onLine) void replay();
}
