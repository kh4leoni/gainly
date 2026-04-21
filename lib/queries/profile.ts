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
