"use client";

import { getDB } from "./db";
import { newUuid } from "./uuid";
import { triggerSync } from "./sync";
import type { LocalSetLog, LocalScheduledWorkout, LocalWorkoutLog } from "./types";

export type LogSetInput = {
  workout_log_id: string;
  exercise_id: string;
  program_exercise_id: string | null;
  set_number: number | null;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

export async function logSet(input: LogSetInput): Promise<LocalSetLog> {
  const db = getDB();
  const id = newUuid();
  const now = new Date().toISOString();
  const row: LocalSetLog = {
    id,
    workout_log_id: input.workout_log_id,
    exercise_id: input.exercise_id,
    program_exercise_id: input.program_exercise_id,
    set_number: input.set_number,
    weight: input.weight,
    reps: input.reps,
    rpe: input.rpe,
    is_pr: false,
    estimated_1rm: null,
    updated_at: now,
    synced: 0,
  };
  await db.set_logs.put(row);
  void triggerSync();
  return row;
}

export async function deleteSet(id: string, workoutLogId?: string): Promise<void> {
  const db = getDB();
  const local = await db.set_logs.get(id);

  if (!local) {
    // Row not in Dexie (e.g. confirmed online before offline layer was active).
    // Tombstone with minimal data so sync can issue the server DELETE.
    if (!workoutLogId) return;
    await db.set_logs.put({
      id,
      workout_log_id: workoutLogId,
      exercise_id: "",
      program_exercise_id: null,
      set_number: null,
      weight: null,
      reps: null,
      rpe: null,
      is_pr: false,
      estimated_1rm: null,
      updated_at: new Date().toISOString(),
      synced: 0,
      deleted: 1,
    });
    void triggerSync();
    return;
  }

  // Always tombstone — never hard-delete. If an insert-sync is already
  // in-flight for this id, the sync completion checks for tombstones and
  // skips resurrection. The tombstone then triggers a server DELETE on the
  // next sync cycle.
  await db.set_logs.put({ ...local, deleted: 1, synced: 0, updated_at: new Date().toISOString() });
  void triggerSync();
}

export async function ensureWorkoutLog(opts: {
  scheduled_workout_id: string;
  client_id: string;
  existingId?: string | null;
}): Promise<LocalWorkoutLog> {
  const db = getDB();

  if (opts.existingId) {
    const existing = await db.workout_logs.get(opts.existingId);
    if (existing) return existing;
  }

  const local = await db.workout_logs
    .where("scheduled_workout_id")
    .equals(opts.scheduled_workout_id)
    .first();
  if (local) return local;

  const id = newUuid();
  const now = new Date().toISOString();
  const row: LocalWorkoutLog = {
    id,
    scheduled_workout_id: opts.scheduled_workout_id,
    client_id: opts.client_id,
    logged_at: now,
    notes: null,
    updated_at: now,
    synced: 0,
  };
  await db.workout_logs.put(row);
  void triggerSync();
  return row;
}

export async function completeWorkout(opts: {
  scheduled_workout_id: string;
  client_id: string;
  scheduled_date: string | null;
  program_id: string | null;
  day_id: string | null;
}): Promise<LocalScheduledWorkout> {
  const db = getDB();
  const now = new Date().toISOString();
  const existing = await db.scheduled_workouts.get(opts.scheduled_workout_id);
  const row: LocalScheduledWorkout = {
    id: opts.scheduled_workout_id,
    client_id: opts.client_id,
    scheduled_date: existing?.scheduled_date ?? opts.scheduled_date,
    program_id: existing?.program_id ?? opts.program_id,
    day_id: existing?.day_id ?? opts.day_id,
    status: "completed",
    completed_at: now,
    updated_at: now,
    synced: 0,
  };
  await db.scheduled_workouts.put(row);
  void triggerSync();
  return row;
}

export async function uncompleteWorkout(scheduled_workout_id: string, opts: {
  client_id: string;
  scheduled_date: string | null;
  program_id: string | null;
  day_id: string | null;
}): Promise<void> {
  const db = getDB();
  const now = new Date().toISOString();
  const existing = await db.scheduled_workouts.get(scheduled_workout_id);
  await db.scheduled_workouts.put({
    id: scheduled_workout_id,
    client_id: opts.client_id,
    scheduled_date: existing?.scheduled_date ?? opts.scheduled_date,
    program_id: existing?.program_id ?? opts.program_id,
    day_id: existing?.day_id ?? opts.day_id,
    status: "pending",
    completed_at: null,
    updated_at: now,
    synced: 0,
  });
  void triggerSync();
}
