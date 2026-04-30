"use server";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCoachName(full_name: string) {
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
  revalidatePath("/coach");
}

export async function updateCoachEmail(email: string) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  const trimmed = email.trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ email: trimmed || null })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/coach");
}

export async function updateCoachPhone(phone: string) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  const trimmed = phone.trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ phone: trimmed || null })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/coach");
}
