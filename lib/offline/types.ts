import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

export type ScheduledWorkoutRow = Tables["scheduled_workouts"]["Row"];
export type WorkoutLogRow = Tables["workout_logs"]["Row"];
export type SetLogRow = Tables["set_logs"]["Row"];

export type SyncedFlag = 0 | 1;

export type LocalScheduledWorkout = ScheduledWorkoutRow & { synced: SyncedFlag };
export type LocalWorkoutLog = WorkoutLogRow & { synced: SyncedFlag };
export type LocalSetLog = SetLogRow & { synced: SyncedFlag; deleted?: SyncedFlag };
