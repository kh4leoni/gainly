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
