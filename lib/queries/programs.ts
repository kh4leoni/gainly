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
  // Legacy flat weeks — kept for backward compat with client-detail page queries
  program_weeks?: Array<{
    id: string;
    week_number: number;
    name: string | null;
    description: string | null;
    is_active: boolean;
    program_days: Array<{
      id: string;
      day_number: number;
      name: string | null;
      description: string | null;
      program_exercises: ProgramExerciseRow[];
    }>;
  }>;
  program_blocks: Array<{
    id: string;
    block_number: number;
    name: string | null;
    description: string | null;
    program_weeks: Array<{
      id: string;
      week_number: number;
      name: string | null;
      description: string | null;
      is_active: boolean;
      program_days: Array<{
        id: string;
        day_number: number;
        name: string | null;
        description: string | null;
        program_exercises: ProgramExerciseRow[];
      }>;
    }>;
  }>;
};

export async function getProgramFull(supabase: DB, programId: string): Promise<ProgramFull> {
  const { data, error } = await supabase
    .from("programs")
    .select(`
      id, title, description, coach_id, client_id, is_template,
      program_blocks (
        id, block_number, name, description,
        program_weeks (
          id, week_number, name, description, is_active,
          program_days (
            id, day_number, name, description,
            program_exercises (
              id, order_idx, sets, reps, intensity, intensity_type, target_rpe, rest_sec, notes,
              exercise_id,
              exercises ( id, name, video_path, instructions )
            )
          )
        )
      )
    `)
    .eq("id", programId)
    .single();
  if (error) throw error;

  // Sort nested arrays in JS (Supabase nested ordering has limited depth support)
  const raw = data as unknown as ProgramFull;
  raw.program_blocks.sort((a, b) => a.block_number - b.block_number);
  for (const block of raw.program_blocks) {
    block.program_weeks.sort((a, b) => a.week_number - b.week_number);
    for (const week of block.program_weeks) {
      week.program_days.sort((a, b) => a.day_number - b.day_number);
      for (const day of week.program_days) {
        day.program_exercises.sort((a, b) => a.order_idx - b.order_idx);
      }
    }
  }
  return raw;
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

  // Seed: block → week → day so the editor is immediately useful
  const { data: block } = await supabase
    .from("program_blocks")
    .insert({ program_id: prog.id, block_number: 1 })
    .select()
    .single();
  if (block) {
    const { data: week } = await supabase
      .from("program_weeks")
      .insert({ program_id: prog.id, block_id: block.id, week_number: 1 })
      .select()
      .single();
    if (week) {
      await supabase.from("program_days").insert({ week_id: week.id, day_number: 1 });
    }
  }

  return prog;
}
