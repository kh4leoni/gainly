import Dexie, { type Table } from "dexie";
import type {
  LocalScheduledWorkout,
  LocalSetLog,
  LocalWorkoutLog,
} from "./types";

class GainlyDB extends Dexie {
  scheduled_workouts!: Table<LocalScheduledWorkout, string>;
  workout_logs!: Table<LocalWorkoutLog, string>;
  set_logs!: Table<LocalSetLog, string>;

  constructor() {
    super("gainly-offline");
    this.version(1).stores({
      scheduled_workouts: "id, client_id, synced, updated_at",
      workout_logs: "id, client_id, scheduled_workout_id, synced, updated_at",
      set_logs: "id, workout_log_id, exercise_id, synced, updated_at",
    });
    this.version(2).stores({
      scheduled_workouts: "id, client_id, synced, updated_at",
      workout_logs: "id, client_id, scheduled_workout_id, synced, updated_at",
      set_logs: "id, workout_log_id, exercise_id, synced, updated_at, deleted",
    }).upgrade(async (tx) => {
      await tx.table("set_logs").toCollection().modify((s) => { s.deleted = 0; });
    });
  }
}

let _db: GainlyDB | undefined;

export function getDB(): GainlyDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie cannot be accessed on the server");
  }
  if (!_db) _db = new GainlyDB();
  return _db;
}
