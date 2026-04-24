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
      target_rpe: number | null;
      target_rpes: (number | null)[] | null;
      set_configs: Array<{ reps: string | null; weight: number | null; rpe: number | null }> | null;
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
          id, order_idx, sets, reps, intensity, intensity_type, target_rpe, target_rpes, set_configs, rest_sec, notes,
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
          id, order_idx, sets, reps, intensity, intensity_type, target_rpe, target_rpes, set_configs, rest_sec, notes,
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
    .select("id, scheduled_date, status, program_days(name, day_number, program_weeks(is_active))")
    .eq("client_id", clientId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date");
  if (error) throw error;
  return (data ?? []).filter((w) => {
    const pw = (w.program_days as any)?.program_weeks;
    if (!pw) return true;
    return pw.is_active === true;
  });
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

export async function getRecentPRs(supabase: DB, clientId: string, limit = 250) {
  const { data, error } = await supabase
    .from("personal_records")
    .select(`
      id, reps, weight, estimated_1rm, achieved_at,
      exercises ( id, name )
    `)
    .eq("client_id", clientId)
    .order("reps", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type PastWorkout = {
  id: string;
  scheduled_date: string;
  completed_at: string | null;
  program_days: {
    name: string | null;
    program_exercises: Array<{ order_idx: number; exercises: { name: string } | null }>;
  } | null;
  workout_logs: Array<{
    notes: string | null;
    set_logs: Array<{
      set_number: number | null;
      weight: number | null;
      reps: number | null;
      rpe: number | null;
      is_pr: boolean;
      exercises: { name: string } | null;
    }>;
  }>;
};

export async function getPastWorkouts(supabase: DB, clientId: string, limit = 60): Promise<PastWorkout[]> {
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .select(`
      id, scheduled_date, completed_at,
      program_days (
        name,
        program_exercises ( order_idx, exercises ( name ) )
      ),
      workout_logs (
        notes,
        set_logs (
          set_number, weight, reps, rpe, is_pr,
          exercises ( name )
        )
      )
    `)
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PastWorkout[];
}

export type ScheduleDay = {
  id: string;
  scheduled_date: string;
  status: string;
  program_days: {
    name: string | null;
    day_number: number;
    program_weeks: { id: string; week_number: number; description: string | null; is_active: boolean } | null;
    program_exercises: Array<{ order_idx: number; exercises: { name: string } | null }>;
  } | null;
};

export async function getClientSchedule(supabase: DB, clientId: string): Promise<ScheduleDay[]> {
  const from = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  const to   = new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .select(`
      id, scheduled_date, status,
      program_days(
        name, day_number,
        program_weeks(id, week_number, description, is_active),
        program_exercises(order_idx, exercises(name))
      )
    `)
    .eq("client_id", clientId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date");
  if (error) throw error;
  return (data ?? []) as unknown as ScheduleDay[];
}

export async function getClientStreak(supabase: DB, clientId: string): Promise<number> {
  const { data } = await supabase
    .from("workout_logs")
    .select("logged_at")
    .eq("client_id", clientId)
    .order("logged_at", { ascending: false })
    .limit(100);
  if (!data || data.length === 0) return 0;
  const loggedDays = new Set(data.map((w) => w.logged_at.slice(0, 10)));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const start = loggedDays.has(todayStr) ? 0 : 1;
  let streak = 0;
  for (let i = start; i <= 90; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (loggedDays.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  return streak;
}

export async function getClientCompliance(supabase: DB, clientId: string): Promise<number> {
  const from = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  const to   = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("scheduled_workouts")
    .select("status")
    .eq("client_id", clientId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to);
  if (!data || data.length === 0) return 0;
  return Math.round((data.filter((w) => w.status === "completed").length / data.length) * 100);
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
