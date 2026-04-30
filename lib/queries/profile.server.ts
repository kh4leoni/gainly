import { cache } from "react";
import { createClient, getCachedUser } from "@/lib/supabase/server";

// Server-only — uses next/headers via createClient. Do not import in Client Components.

export const getMeCached = cache(async () => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, phone, email")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
});

export const getMyWaistHistoryCached = cache(async () => {
  const user = await getCachedUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("waist_measurements")
    .select("waist_cm, logged_at")
    .eq("client_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(20);
  return (data ?? []).map(r => ({ value: r.waist_cm, logged_at: r.logged_at }));
});

export const getMyBodyweightHistoryCached = cache(async () => {
  const user = await getCachedUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("bodyweights")
    .select("weight_kg, logged_at")
    .eq("client_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(20);
  return (data ?? []).map(r => ({ value: r.weight_kg, logged_at: r.logged_at }));
});

export const getMyCoachCached = cache(async () => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_clients")
    .select("profiles:coach_id (full_name, email, phone)")
    .eq("client_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const coach = data?.profiles as unknown as { full_name: string | null; email: string | null; phone: string | null } | null;
  if (!coach) return null;
  return { name: coach.full_name, email: coach.email, phone: coach.phone };
});
