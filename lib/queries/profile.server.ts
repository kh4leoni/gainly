import { cache } from "react";
import { createClient, getCachedUser } from "@/lib/supabase/server";

// Server-only — uses next/headers via createClient. Do not import in Client Components.

export const getMeCached = cache(async () => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
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
