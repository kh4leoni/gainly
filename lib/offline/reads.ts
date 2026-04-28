"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "./db";
import type { LocalScheduledWorkout, LocalSetLog, LocalWorkoutLog } from "./types";

export function mergeById<T extends { id: string; updated_at: string | null }>(
  remote: readonly T[],
  local: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const r of remote) byId.set(r.id, r);
  for (const l of local) {
    const r = byId.get(l.id);
    if (!r) {
      byId.set(l.id, l);
      continue;
    }
    const lAt = l.updated_at ? Date.parse(l.updated_at) : 0;
    const rAt = r.updated_at ? Date.parse(r.updated_at) : 0;
    byId.set(l.id, lAt >= rAt ? l : r);
  }
  return Array.from(byId.values());
}

export function useLocalSetLogs(workoutLogId: string | null | undefined): LocalSetLog[] | undefined {
  return useLiveQuery(async () => {
    if (!workoutLogId) return [];
    const all = await getDB().set_logs.where("workout_log_id").equals(workoutLogId).toArray();
    return all.filter((s) => s.deleted !== 1);
  }, [workoutLogId]);
}

type LocalSetLogsResult = { sets: LocalSetLog[]; deletedIds: Set<string> };

// Single query returning live sets + deleted ids atomically — both update
// in the same render cycle, preventing stale-deletedIds races in useEffect.
export function useLocalSetLogsAndDeleted(workoutLogId: string | null | undefined): LocalSetLogsResult {
  return useLiveQuery(async () => {
    if (!workoutLogId) return { sets: [], deletedIds: new Set<string>() };
    const all = await getDB().set_logs.where("workout_log_id").equals(workoutLogId).toArray();
    return {
      sets: all.filter((s) => s.deleted !== 1),
      deletedIds: new Set(all.filter((s) => s.deleted === 1).map((s) => s.id)),
    };
  }, [workoutLogId]) ?? { sets: [], deletedIds: new Set<string>() };
}

export function useDeletedSetIds(workoutLogId: string | null | undefined): Set<string> {
  return useLiveQuery(async () => {
    if (!workoutLogId) return new Set<string>();
    const rows = await getDB().set_logs
      .where("workout_log_id").equals(workoutLogId)
      .filter((s) => s.deleted === 1)
      .toArray();
    return new Set(rows.map((s) => s.id));
  }, [workoutLogId]) ?? new Set<string>();
}

export function useLocalScheduledWorkout(scheduledWorkoutId: string | null | undefined): LocalScheduledWorkout | undefined {
  return useLiveQuery(async () => {
    if (!scheduledWorkoutId) return undefined;
    return getDB().scheduled_workouts.get(scheduledWorkoutId);
  }, [scheduledWorkoutId]);
}

export function useLocalWorkoutLog(scheduledWorkoutId: string | null | undefined): LocalWorkoutLog | undefined {
  return useLiveQuery(async () => {
    if (!scheduledWorkoutId) return undefined;
    return getDB().workout_logs
      .where("scheduled_workout_id").equals(scheduledWorkoutId).first();
  }, [scheduledWorkoutId]);
}

export function useUnsyncedForWorkout(scheduledWorkoutId: string | null | undefined): boolean {
  return useLiveQuery(async () => {
    if (!scheduledWorkoutId) return false;
    const db = getDB();
    const sw = await db.scheduled_workouts.get(scheduledWorkoutId);
    if (sw?.synced === 0) return true;
    const wl = await db.workout_logs.where("scheduled_workout_id").equals(scheduledWorkoutId).first();
    if (wl?.synced === 0) return true;
    if (!wl) return false;
    const setUnsynced = await db.set_logs
      .where("workout_log_id").equals(wl.id)
      .filter((s) => s.synced === 0 || s.deleted === 1)
      .count();
    return setUnsynced > 0;
  }, [scheduledWorkoutId]) ?? false;
}

export function useLocalCompletedNotInServer(
  clientId: string,
  serverIds: readonly string[],
): LocalScheduledWorkout[] {
  const key = serverIds.join(",");
  return useLiveQuery(async () => {
    if (!clientId) return [];
    const set = new Set(serverIds);
    const all = await getDB().scheduled_workouts
      .where("client_id").equals(clientId)
      .filter((s) => s.status === "completed")
      .toArray();
    return all.filter((s) => !set.has(s.id));
  }, [clientId, key]) ?? [];
}

export function useUnsyncedCount(): number {
  return useLiveQuery(async () => {
    const db = getDB();
    const [a, b, c] = await Promise.all([
      db.scheduled_workouts.where("synced").equals(0).count(),
      db.workout_logs.where("synced").equals(0).count(),
      db.set_logs.where("synced").equals(0).count(),
    ]);
    return a + b + c;
  }, []) ?? 0;
}

type SetLogHydrate = {
  id: string; workout_log_id: string; exercise_id: string;
  program_exercise_id: string | null; set_number: number | null;
  weight: number | null; reps: number | null; rpe: number | null;
  is_pr: boolean; estimated_1rm: number | null;
  updated_at?: string | null;
};

export async function hydrateSetLogs(rows: readonly SetLogHydrate[]): Promise<void> {
  if (typeof window === "undefined") return;
  const db = getDB();
  await db.transaction("rw", db.set_logs, async () => {
    const serverIds = new Set(rows.map((r) => r.id));

    // Prune confirmed tombstones (synced:1, deleted:1) whose ids the server
    // no longer returns — deletion is confirmed, safe to purge.
    if (rows.length > 0) {
      const wlId = rows[0]?.workout_log_id;
      if (wlId) {
        const tombstones = await db.set_logs
          .where("workout_log_id").equals(wlId)
          .filter((s) => s.deleted === 1 && s.synced === 1)
          .toArray();
        for (const t of tombstones) {
          if (!serverIds.has(t.id)) await db.set_logs.delete(t.id);
        }
      }
    }

    for (const r of rows) {
      const ts = r.updated_at ?? new Date().toISOString();
      const existing = await db.set_logs.get(r.id);
      // Don't resurrect any tombstoned row (pending or confirmed).
      if (existing?.deleted === 1) continue;
      if (existing && existing.synced === 0) {
        const lAt = existing.updated_at ? Date.parse(existing.updated_at) : 0;
        const rAt = Date.parse(ts);
        if (lAt > rAt) continue;
      }
      await db.set_logs.put({ ...r, updated_at: ts, synced: 1, deleted: 0 });
    }
  });
}

type WorkoutLogHydrate = {
  id: string; scheduled_workout_id: string | null; client_id: string;
  logged_at: string; notes: string | null; updated_at?: string | null;
};

export async function hydrateWorkoutLog(row: WorkoutLogHydrate): Promise<void> {
  if (typeof window === "undefined") return;
  const db = getDB();
  const ts = row.updated_at ?? new Date().toISOString();
  const existing = await db.workout_logs.get(row.id);
  if (existing && existing.synced === 0) {
    const lAt = existing.updated_at ? Date.parse(existing.updated_at) : 0;
    const rAt = Date.parse(ts);
    if (lAt > rAt) return;
  }
  await db.workout_logs.put({ ...row, updated_at: ts, synced: 1 });
}
