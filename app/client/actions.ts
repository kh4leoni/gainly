"use server";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function logBodyweight(weight_kg: number) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  if (weight_kg <= 0 || weight_kg >= 500) throw new Error("Invalid weight");
  const supabase = await createClient();
  const { error } = await supabase
    .from("bodyweights")
    .insert({ client_id: user.id, weight_kg });
  if (error) throw error;
  revalidatePath("/client");
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

export async function logWaist(waist_cm: number) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  if (waist_cm <= 0 || waist_cm >= 300) throw new Error("Invalid measurement");
  const supabase = await createClient();
  const { error } = await supabase
    .from("waist_measurements")
    .insert({ client_id: user.id, waist_cm });
  if (error) throw error;
  revalidatePath("/client");
}
