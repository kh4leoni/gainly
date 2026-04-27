"use client";

import { createClient } from "@/lib/supabase/client";
import { getDB } from "./db";
import type {
  LocalScheduledWorkout,
  LocalSetLog,
  LocalWorkoutLog,
  ScheduledWorkoutRow,
  SetLogRow,
  WorkoutLogRow,
} from "./types";

type RpcResult = {
  scheduled_workout: ScheduledWorkoutRow | null;
  workout_log: WorkoutLogRow | null;
  set_logs: SetLogRow[];
  deleted_set_ids: string[];
};

let inflight: Promise<void> | null = null;
let pendingRetry = false;

const listeners = new Set<(state: { running: boolean }) => void>();

export function subscribeSyncState(cb: (s: { running: boolean }) => void): () => void {
  listeners.add(cb);
  cb({ running: inflight !== null });
  return () => { listeners.delete(cb); };
}

function emit() {
  for (const cb of listeners) cb({ running: inflight !== null });
}

export function triggerSync(_meta?: { deletedSetId?: string }): Promise<void> {
  return syncNow();
}

export function syncNow(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!navigator.onLine) return Promise.resolve();
  if (inflight) {
    pendingRetry = true;
    return inflight;
  }

  inflight = (async () => {
    try {
      await runSync();
    } catch (e) {
      console.warn("[sync] failed", e);
    } finally {
      inflight = null;
      emit();
      if (pendingRetry) {
        pendingRetry = false;
        void syncNow();
      }
    }
  })();
  emit();
  return inflight;
}

async function runSync(): Promise<void> {
  const db = getDB();
  const supabase = createClient();

  const [pendingScheduled, pendingLogs, pendingSetsAll] = await Promise.all([
    db.scheduled_workouts.where("synced").equals(0).toArray(),
    db.workout_logs.where("synced").equals(0).toArray(),
    db.set_logs.where("synced").equals(0).toArray(),
  ]);

  const pendingSets = pendingSetsAll.filter((s) => s.deleted !== 1);
  const tombstones = pendingSetsAll.filter((s) => s.deleted === 1);

  if (!pendingScheduled.length && !pendingLogs.length && !pendingSets.length && !tombstones.length) {
    console.debug("[sync] nothing pending");
    return;
  }
  console.debug("[sync] pending — sw:", pendingScheduled.length, "wl:", pendingLogs.length, "sets:", pendingSets.length, "tombstones:", tombstones.length);

  const groups = new Map<string, {
    scheduled: LocalScheduledWorkout | null;
    workoutLog: LocalWorkoutLog | null;
    sets: LocalSetLog[];
    deletedIds: string[];
  }>();

  function group(workoutLogId: string) {
    let g = groups.get(workoutLogId);
    if (!g) {
      g = { scheduled: null, workoutLog: null, sets: [], deletedIds: [] };
      groups.set(workoutLogId, g);
    }
    return g;
  }

  for (const wl of pendingLogs) {
    group(wl.id).workoutLog = wl;
  }
  for (const sl of pendingSets) {
    group(sl.workout_log_id).sets.push(sl);
  }
  for (const t of tombstones) {
    group(t.workout_log_id).deletedIds.push(t.id);
  }
  for (const sw of pendingScheduled) {
    let attached = false;
    for (const wl of pendingLogs) {
      if (wl.scheduled_workout_id === sw.id) {
        group(wl.id).scheduled = sw;
        attached = true;
        break;
      }
    }
    if (!attached) {
      const existingLog = await db.workout_logs
        .where("scheduled_workout_id").equals(sw.id).first();
      const key = existingLog?.id ?? `__sw_${sw.id}`;
      group(key).scheduled = sw;
    }
  }

  for (const [, g] of groups) {
    await syncGroup(supabase, g);
  }
}

async function syncGroup(
  supabase: ReturnType<typeof createClient>,
  g: { scheduled: LocalScheduledWorkout | null; workoutLog: LocalWorkoutLog | null; sets: LocalSetLog[]; deletedIds: string[] },
): Promise<void> {
  const db = getDB();

  const payload = {
    p_scheduled: g.scheduled ? toScheduledPayload(g.scheduled) : null,
    p_workout: g.workoutLog ? toWorkoutLogPayload(g.workoutLog) : null,
    p_sets: g.sets.map(toSetLogPayload),
    p_deleted_set_ids: g.deletedIds,
  };

  const { data, error } = await supabase.rpc("upsert_workout_with_sets", payload);
  if (error) {
    console.warn("[sync] rpc error", error.message, error);
    return;
  }
  console.debug("[sync] rpc ok", data);

  const result = data as unknown as RpcResult;

  await db.transaction("rw", db.scheduled_workouts, db.workout_logs, db.set_logs, async () => {
    if (result.scheduled_workout) {
      await db.scheduled_workouts.put({ ...result.scheduled_workout, synced: 1 });
    } else if (g.scheduled) {
      // RPC returned no row (server row missing / UPDATE matched nothing).
      // Mark synced so the queue doesn't grow indefinitely.
      await db.scheduled_workouts.put({ ...g.scheduled, synced: 1 });
    }
    if (result.workout_log) {
      await db.workout_logs.put({ ...result.workout_log, synced: 1 });
    } else if (g.workoutLog) {
      await db.workout_logs.put({ ...g.workoutLog, synced: 1 });
    }
    if (Array.isArray(result.set_logs)) {
      for (const row of result.set_logs) {
        const existing = await db.set_logs.get(row.id);
        // If tombstoned while this sync was in-flight, skip resurrection.
        // The tombstone will trigger a server DELETE on the next cycle.
        if (existing?.deleted === 1) continue;
        await db.set_logs.put({ ...row, synced: 1, deleted: 0 });
      }
    }
    // Mark tombstones as synced:1 — keep deleted:1 flag so the row stays
    // filtered from UI until the server query confirms it's gone. Pruned in
    // hydrateSetLogs once the server response no longer includes the id.
    for (const id of g.deletedIds) {
      const t = await db.set_logs.get(id);
      if (t) await db.set_logs.put({ ...t, synced: 1 });
      else await db.set_logs.put({ id, deleted: 1, synced: 1,
        workout_log_id: "", exercise_id: "", program_exercise_id: null,
        set_number: null, weight: null, reps: null, rpe: null,
        is_pr: false, estimated_1rm: null, updated_at: new Date().toISOString() });
    }
  });
}

function toScheduledPayload(r: LocalScheduledWorkout) {
  return {
    id: r.id,
    program_id: r.program_id,
    day_id: r.day_id,
    client_id: r.client_id,
    scheduled_date: r.scheduled_date,
    status: r.status,
    completed_at: r.completed_at,
    updated_at: r.updated_at,
  };
}

function toWorkoutLogPayload(r: LocalWorkoutLog) {
  return {
    id: r.id,
    scheduled_workout_id: r.scheduled_workout_id,
    client_id: r.client_id,
    logged_at: r.logged_at,
    updated_at: r.updated_at,
  };
}

function toSetLogPayload(r: LocalSetLog) {
  return {
    id: r.id,
    workout_log_id: r.workout_log_id,
    program_exercise_id: r.program_exercise_id,
    exercise_id: r.exercise_id,
    set_number: r.set_number,
    weight: r.weight,
    reps: r.reps,
    rpe: r.rpe,
    updated_at: r.updated_at,
  };
}

export function installSyncListeners(): () => void {
  if (typeof window === "undefined") return () => {};

  const onOnline = () => { void syncNow(); };
  const onVisibility = () => { if (document.visibilityState === "visible") void syncNow(); };
  const onFocus = () => { void syncNow(); };
  const onSwMessage = (e: MessageEvent) => {
    if (e.data?.type === "SYNC_NOW") void syncNow();
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  navigator.serviceWorker?.addEventListener("message", onSwMessage);

  void syncNow();

  registerBackgroundSync();

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
    navigator.serviceWorker?.removeEventListener("message", onSwMessage);
  };
}

async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    }).sync;
    await sync?.register("gainly-sync");
  } catch {
    // BG Sync not available (iOS Safari) — fallbacks above cover it.
  }
}
