import type { DB } from "./types";

export async function getCoachDashboard(supabase: DB) {
  const { data, error } = await supabase.rpc("coach_dashboard");
  if (error) throw error;
  return data ?? [];
}

export async function getClients(supabase: DB, coachId: string) {
  const { data, error } = await supabase
    .from("coach_clients")
    .select(`
      client_id,
      status,
      profiles:client_id (id, full_name, avatar_url)
    `)
    .eq("coach_id", coachId)
    .eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

export async function getClient(supabase: DB, clientId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, created_at")
    .eq("id", clientId)
    .single();
  if (error) throw error;
  return data;
}

export type AttentionClient = {
  client_id: string;
  full_name: string | null;
  program: string | null;
  lastWorkout: string | null;
  today_status: string | null;
};

export type RecentPR = {
  id: string;
  client_id: string;
  rep_range: string;
  weight: number | null;
  achieved_at: string;
  exercise_name: string | null;
  client_name: string | null;
};

export type UpcomingWorkout = {
  id: string;
  client_id: string;
  scheduled_date: string;
  status: string;
  client_name: string | null;
};

export type ComplianceStat = {
  clientId: string;
  name: string;
  completed: number;
  total: number;
  pct: number;
};

export type FullDashboard = {
  activeCount: number;
  totalCount: number;
  prCount: number;
  setCount: number;
  unreadCount: number;
  attentionClients: AttentionClient[];
  recentPRs: RecentPR[];
  upcomingWorkouts: UpcomingWorkout[];
  compliance: ComplianceStat[];
};

export async function getCoachFullDashboard(
  supabase: DB,
  coachId: string,
): Promise<FullDashboard> {
  const [{ count: totalCount }, { data: activeClients }] = await Promise.all([
    supabase
      .from("coach_clients")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId),
    supabase
      .from("coach_clients")
      .select("client_id")
      .eq("coach_id", coachId)
      .eq("status", "active"),
  ]);

  const clientIds = (activeClients ?? []).map((c) => c.client_id);

  const empty: FullDashboard = {
    activeCount: 0,
    totalCount: totalCount ?? 0,
    prCount: 0,
    setCount: 0,
    unreadCount: 0,
    attentionClients: [],
    recentPRs: [],
    upcomingWorkouts: [],
    compliance: [],
  };
  if (clientIds.length === 0) return empty;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const today = (now.toISOString().split("T")[0] ?? "") as string;
  const nextWeek = (new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0] ?? "") as string;
  const fourWeeksAgo = (new Date(now.getTime() - 28 * 86400000).toISOString().split("T")[0] ?? "") as string;

  const [
    { count: prCount },
    { data: wlData },
    { data: recentPRsRaw },
    { data: upcomingRaw },
    { data: complianceRaw },
    { data: dashRaw },
    { data: clientProgramsRaw },
    { data: lastWorkoutsRaw },
  ] = await Promise.all([
    supabase
      .from("personal_records")
      .select("*", { count: "exact", head: true })
      .in("client_id", clientIds)
      .gte("achieved_at", monthStart),
    supabase
      .from("workout_logs")
      .select("id")
      .in("client_id", clientIds)
      .gte("logged_at", weekAgo),
    supabase
      .from("personal_records")
      .select("id, client_id, rep_range, weight, achieved_at, exercises:exercise_id(name), profiles:client_id(full_name)")
      .in("client_id", clientIds)
      .order("achieved_at", { ascending: false })
      .limit(6),
    supabase
      .from("scheduled_workouts")
      .select("id, client_id, scheduled_date, status, profiles:client_id(full_name)")
      .in("client_id", clientIds)
      .gte("scheduled_date", today)
      .lte("scheduled_date", nextWeek)
      .order("scheduled_date")
      .limit(8),
    supabase
      .from("scheduled_workouts")
      .select("client_id, status, profiles:client_id(full_name)")
      .in("client_id", clientIds)
      .gte("scheduled_date", fourWeeksAgo),
    supabase.rpc("coach_dashboard"),
    supabase
      .from("programs")
      .select("client_id, title")
      .in("client_id", clientIds)
      .eq("is_template", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("workout_logs")
      .select("client_id, logged_at")
      .in("client_id", clientIds)
      .order("logged_at", { ascending: false })
      .limit(clientIds.length * 10),
  ]);

  // Sets this week
  const wlIds = (wlData ?? []).map((w) => w.id);
  const { count: setCount } =
    wlIds.length > 0
      ? await supabase
          .from("set_logs")
          .select("*", { count: "exact", head: true })
          .in("workout_log_id", wlIds)
      : { count: 0 };

  const unreadCount = (dashRaw ?? []).reduce((s, r) => s + r.unread_count, 0);

  // Latest program per client
  const programByClient = new Map<string, string>();
  for (const p of clientProgramsRaw ?? []) {
    if (p.client_id && !programByClient.has(p.client_id))
      programByClient.set(p.client_id, p.title);
  }

  // Last workout per client
  const lastWorkoutByClient = new Map<string, string>();
  for (const w of lastWorkoutsRaw ?? []) {
    if (!lastWorkoutByClient.has(w.client_id))
      lastWorkoutByClient.set(w.client_id, w.logged_at);
  }

  // Attention: all clients not completed today
  const attentionClients: AttentionClient[] = (dashRaw ?? [])
    .filter((r) => r.today_status !== "completed")
    .map((r) => ({
      client_id: r.client_id,
      full_name: r.full_name,
      program: programByClient.get(r.client_id) ?? null,
      lastWorkout: lastWorkoutByClient.get(r.client_id) ?? null,
      today_status: r.today_status,
    }));

  // Recent PRs
  type RawPR = {
    id: string; client_id: string; rep_range: string;
    weight: number | null; achieved_at: string;
    exercises: { name: string } | null;
    profiles: { full_name: string | null } | null;
  };
  const recentPRs: RecentPR[] = ((recentPRsRaw ?? []) as unknown as RawPR[]).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    rep_range: r.rep_range,
    weight: r.weight,
    achieved_at: r.achieved_at,
    exercise_name: r.exercises?.name ?? null,
    client_name: r.profiles?.full_name ?? null,
  }));

  // Upcoming workouts
  type RawUpcoming = {
    id: string; client_id: string; scheduled_date: string; status: string;
    profiles: { full_name: string | null } | null;
  };
  const upcomingWorkouts: UpcomingWorkout[] = ((upcomingRaw ?? []) as unknown as RawUpcoming[]).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    scheduled_date: r.scheduled_date,
    status: r.status,
    client_name: r.profiles?.full_name ?? null,
  }));

  // Compliance
  type RawComp = {
    client_id: string; status: string;
    profiles: { full_name: string | null } | null;
  };
  const compMap = new Map<string, { name: string; completed: number; total: number }>();
  for (const row of (complianceRaw ?? []) as unknown as RawComp[]) {
    const name = row.profiles?.full_name ?? row.client_id;
    const e = compMap.get(row.client_id) ?? { name, completed: 0, total: 0 };
    e.total++;
    if (row.status === "completed") e.completed++;
    compMap.set(row.client_id, e);
  }
  const compliance: ComplianceStat[] = Array.from(compMap.entries())
    .map(([clientId, c]) => ({
      clientId,
      name: c.name,
      completed: c.completed,
      total: c.total,
      pct: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);

  return {
    activeCount: clientIds.length,
    totalCount: totalCount ?? 0,
    prCount: prCount ?? 0,
    setCount: setCount ?? 0,
    unreadCount,
    attentionClients,
    recentPRs,
    upcomingWorkouts,
    compliance,
  };
}
