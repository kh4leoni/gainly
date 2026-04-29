import { cache } from "react";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { DB } from "./types";

export async function getMe(supabase: DB) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function getMyCoach(supabase: DB) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data } = await supabase
    .from("coach_clients")
    .select("profiles:coach_id (full_name)")
    .eq("client_id", user.user.id)
    .eq("status", "active")
    .maybeSingle();
  const coach = data?.profiles as unknown as { full_name: string | null } | null;
  return coach?.full_name ?? null;
}

// Cached versions — deduplicated per RSC request so layout + page share one call.
export const getMeCached = cache(async () => {
  const supabase = await createClient();
  return getMe(supabase);
});

export const getMyCoachCached = cache(async () => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_clients")
    .select("profiles:coach_id (full_name)")
    .eq("client_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const coach = data?.profiles as unknown as { full_name: string | null } | null;
  return coach?.full_name ?? null;
});
