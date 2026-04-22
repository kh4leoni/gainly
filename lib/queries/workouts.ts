import type { DB } from "./types";

export type TodayWorkout = {
  id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  program_days: {
    id: string;
    day_number: number;
    name: string | null;
    description: string | null;
    program_weeks: { week_number: number; description: string | null } | null;
    program_exercises: Array<{
      id: string;
      order_idx: number;
      sets: number | null;
      reps: string | null;
      intensity: number | null;
      intensity_type: string | null;
      rest_sec: number | null;
      notes: string | null;
      exercise_id: string | null;
      exercises: { id: string; name: string; video_path: string | null; instructions: string | null } | null;
    }>;
  } | null;
};

export async function getTodayWorkout(supabase: DB, clientId: string): Promise<TodayWorkout | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .select(`
      id, scheduled_date, status, completed_at,
      program_days (
        id, day_number, name, description,
        program_weeks ( week_number, description ),
        program_exercises (
          id, order_idx, sets, reps, intensity, intensity_type, rest_sec, notes,
          exercise_id,
          exercises ( id, name, video_path, instructions )
        )
      )
    `)
    .eq("client_id", clientId)
    .eq("scheduled_date", today)
    .order("order_idx", { referencedTable: "program_days.program_exercises" })
    .maybeSingle();
  if (error) throw error;
  return data as unknown as TodayWorkout | null;
}

export type ScheduledWorkoutFull = TodayWorkout & { client_id: string };

export async function getScheduledWorkout(supabase: DB, id: string): Promise<ScheduledWorkoutFull> {
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .select(`
      id, scheduled_date, status, completed_at, client_id,
      program_days (
        id, day_number, name, description,
        program_weeks ( week_number, description ),
        program_exercises (
          id, order_idx, sets, reps, intensity, intensity_type, rest_sec, notes,
          exercise_id,
          exercises ( id, name, video_path, instructions )
        )
      )
    `)
    .eq("id", id)
    .order("order_idx", { referencedTable: "program_days.program_exercises" })
    .single();
  if (error) throw error;
  return data as unknown as ScheduledWorkoutFull;
}

export async function getUpcomingWorkouts(supabase: DB, clientId: string, days = 14) {
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .select("id, scheduled_date, status, program_days(name, day_number)")
    .eq("client_id", clientId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}

export type MonthWorkout = {
  id: string;
  scheduled_date: string;
  status: string;
  program_days: { name: string | null } | null;
};

export async function getMonthWorkouts(
  supabase: DB,
  clientId: string,
  year: number,
  month /* 1-12 */: number
): Promise<MonthWorkout[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .select("id, scheduled_date, status, program_days(name)")
    .eq("client_id", clientId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date");
  if (error) throw error;
  return (data ?? []) as unknown as MonthWorkout[];
}

export async function getRecentPRs(supabase: DB, clientId: string, limit = 5) {
  const { data, error } = await supabase
    .from("personal_records")
    .select(`
      id, rep_range, weight, reps, estimated_1rm, achieved_at,
      exercises ( id, name )
    `)
    .eq("client_id", clientId)
    .order("achieved_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getOneRmCurve(supabase: DB, clientId: string, exerciseId: string, days = 180) {
  const { data, error } = await supabase.rpc("one_rm_curve", {
    _client: clientId,
    _exercise: exerciseId,
    _days: days,
  });
  if (error) throw error;
  return data ?? [];
}
