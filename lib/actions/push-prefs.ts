"use server";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setPushMessagesPref(enabled: boolean) {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ push_messages: enabled })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/client");
  revalidatePath("/coach");
}
