import { cache } from "react";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getMe } from "./profile";

// Server-only — uses next/headers via createClient. Do not import in Client Components.

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
