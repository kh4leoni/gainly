"use server";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function logBodyweight(weight_kg: number): Promise<{ id: string; logged_at: string }> {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  if (weight_kg <= 0 || weight_kg >= 500) throw new Error("Invalid weight");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bodyweights")
    .insert({ client_id: user.id, weight_kg })
    .select("id, logged_at")
    .single();
  if (error || !data) throw error ?? new Error("Insert failed");
  revalidatePath("/client");
  return { id: data.id, logged_at: data.logged_at };
}

export async function updateProfileName(full_name: string) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  const trimmed = full_name.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/client");
}

export async function logWaist(waist_cm: number): Promise<{ id: string; logged_at: string }> {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  if (waist_cm <= 0 || waist_cm >= 300) throw new Error("Invalid measurement");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waist_measurements")
    .insert({ client_id: user.id, waist_cm })
    .select("id, logged_at")
    .single();
  if (error || !data) throw error ?? new Error("Insert failed");
  revalidatePath("/client");
  return { id: data.id, logged_at: data.logged_at };
}

export async function deleteBodyweight(id: string) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  const supabase = await createClient();
  // RLS restricts delete to rows where client_id = auth.uid().
  const { error } = await supabase.from("bodyweights").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/client");
}

export async function deleteWaist(id: string) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  const supabase = await createClient();
  const { error } = await supabase.from("waist_measurements").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/client");
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = await getCachedUser();
  if (!user || !user.email) throw new Error("Not authenticated");
  if (newPassword.length < 8) throw new Error("Uuden salasanan tulee olla vähintään 8 merkkiä");
  const supabase = await createClient();
  // Verify current password by re-authenticating. Without this, anyone with
  // a brief access to the session could lock the user out.
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthErr) throw new Error("Nykyinen salasana ei täsmää");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function deleteAccount(confirmation: string) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  if (confirmation !== "POISTA") throw new Error("Vahvistusta ei kirjoitettu oikein");
  // auth.users delete cascades through profiles → coach_clients, scheduled_workouts,
  // workout_logs, set_logs, personal_records, bodyweights, waist_measurements,
  // threads, messages (all FKs are ON DELETE CASCADE on profiles.id).
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
