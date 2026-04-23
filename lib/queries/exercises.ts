import type { DB } from "./types";

export async function getExercises(supabase: DB) {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, instructions, video_path, muscle_groups, created_by")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function updateExercise(
  supabase: DB,
  id: string,
  patch: { name?: string; instructions?: string | null; video_path?: string | null; muscle_groups?: string[] }
) {
  const { error } = await supabase.from("exercises").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createExercise(
  supabase: DB,
  input: { name: string; instructions?: string | null; muscle_groups?: string[]; video_path?: string | null; created_by: string }
) {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: input.name,
      instructions: input.instructions ?? null,
      muscle_groups: input.muscle_groups ?? [],
      video_path: input.video_path ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
