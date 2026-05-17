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
