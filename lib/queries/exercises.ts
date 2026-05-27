import type { DB } from "./types";

export type ExerciseKind = "lifting" | "cardio" | "free";

export async function getExercises(supabase: DB) {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, name, instructions, video_path, muscle_groups, created_by, kind, tracks_weight, tracks_reps, tracks_distance, tracks_duration, tracks_hr",
    )
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function updateExercise(
  supabase: DB,
  id: string,
  patch: {
    name?: string;
    instructions?: string | null;
    video_path?: string | null;
    muscle_groups?: string[];
    kind?: ExerciseKind;
    tracks_weight?: boolean;
    tracks_reps?: boolean;
    tracks_distance?: boolean;
    tracks_duration?: boolean;
    tracks_hr?: boolean;
  }
) {
  const { error } = await supabase.from("exercises").update(patch).eq("id", id);
  if (error) throw error;
}

export type ExerciseUsage = {
  setLogs: number;
  cardioRecords: number;
  programExercises: number;
  personalRecords: number;
};

// Count every row that would either be deleted (cascade) or orphaned
// (set null) when the exercise is removed. Used to gate the delete
// button to keep coaches from torpedoing their clients' history with
// a tap. All four counts run in parallel.
export async function getExerciseUsage(supabase: DB, id: string): Promise<ExerciseUsage> {
  const [sl, cr, pe, pr] = await Promise.all([
    supabase.from("set_logs").select("id", { count: "exact", head: true }).eq("exercise_id", id),
    supabase.from("cardio_records").select("id", { count: "exact", head: true }).eq("exercise_id", id),
    supabase.from("program_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", id),
    supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("exercise_id", id),
  ]);
  return {
    setLogs: sl.count ?? 0,
    cardioRecords: cr.count ?? 0,
    programExercises: pe.count ?? 0,
    personalRecords: pr.count ?? 0,
  };
}

export async function deleteExercise(supabase: DB, id: string) {
  // RLS policy "coach deletes own" limits this to created_by = auth.uid().
  // The UI must already have confirmed usage = 0 — if anything sneaks
  // through, the cascades on set_logs / personal_records / cardio_records
  // would silently delete history.
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}

export async function createExercise(
  supabase: DB,
  input: {
    name: string;
    instructions?: string | null;
    muscle_groups?: string[];
    video_path?: string | null;
    created_by: string;
    kind?: ExerciseKind;
    tracks_weight?: boolean;
    tracks_reps?: boolean;
    tracks_distance?: boolean;
    tracks_duration?: boolean;
    tracks_hr?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: input.name,
      instructions: input.instructions ?? null,
      muscle_groups: input.muscle_groups ?? [],
      video_path: input.video_path ?? null,
      created_by: input.created_by,
      kind: input.kind ?? "lifting",
      tracks_weight: input.tracks_weight ?? (input.kind ?? "lifting") === "lifting",
      tracks_reps: input.tracks_reps ?? (input.kind ?? "lifting") === "lifting",
      tracks_distance: input.tracks_distance ?? false,
      tracks_duration: input.tracks_duration ?? false,
      tracks_hr: input.tracks_hr ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
