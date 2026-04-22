import type { DB } from "./types";

export async function listPrograms(supabase: DB, coachId: string) {
  const { data, error } = await supabase
    .from("programs")
    .select("id, title, description, client_id, is_template, created_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type ProgramExerciseRow = {
  id: string;
  order_idx: number;
  sets: number | null;
  reps: string | null;
  intensity: number | null;
  intensity_type: string | null;
  target_rpe: number | null;
  rest_sec: number | null;
  notes: string | null;
  exercise_id: string | null;
  exercises: { id: string; name: string; video_path: string | null; instructions: string | null } | null;
};

export type ProgramFull = {
  id: string;
  title: string;
  description: string | null;
  coach_id: string;
  client_id: string | null;
  is_template: boolean;
  program_weeks: Array<{
    id: string;
    week_number: number;
    description: string | null;
    program_days: Array<{
      id: string;
      day_number: number;
      name: string | null;
      description: string | null;
      program_exercises: ProgramExerciseRow[];
    }>;
  }>;
};

// Single-roundtrip full program load (weeks → days → exercises → exercise meta).
export async function getProgramFull(supabase: DB, programId: string): Promise<ProgramFull> {
  const { data, error } = await supabase
    .from("programs")
    .select(`
      id, title, description, coach_id, client_id, is_template,
      program_weeks (
        id, week_number, description,
        program_days (
          id, day_number, name, description,
          program_exercises (
            id, order_idx, sets, reps, intensity, intensity_type, target_rpe, rest_sec, notes,
            exercise_id,
            exercises ( id, name, video_path, instructions )
          )
        )
      )
    `)
    .eq("id", programId)
    .order("week_number", { referencedTable: "program_weeks" })
    .order("day_number", { referencedTable: "program_weeks.program_days" })
    .order("order_idx", { referencedTable: "program_weeks.program_days.program_exercises" })
    .single();
  if (error) throw error;
  return data as unknown as ProgramFull;
}

export async function createProgram(
  supabase: DB,
  input: { coach_id: string; title: string; description?: string | null; client_id?: string | null }
) {
  const { data: prog, error } = await supabase
    .from("programs")
    .insert({
      coach_id: input.coach_id,
      title: input.title,
      description: input.description ?? null,
      client_id: input.client_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Seed with one week + one day so the builder is immediately useful.
  const { data: week } = await supabase
    .from("program_weeks")
    .insert({ program_id: prog.id, week_number: 1 })
    .select()
    .single();
  if (week) {
    await supabase.from("program_days").insert({ week_id: week.id, day_number: 1, name: "Day 1" });
  }

  return prog;
}
