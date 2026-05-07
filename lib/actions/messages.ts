"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { markThreadRead, markAllRead } from "@/lib/queries/messages";

export async function markAllMessagesRead() {
  const user = await getCachedUser();
  if (!user) return;
  const supabase = await createClient();
  await markAllRead(supabase, user.id);
  revalidatePath("/client", "layout");
  revalidatePath("/coach", "layout");
}

export async function markThreadReadAction(threadId: string) {
  if (!threadId) return;
  const user = await getCachedUser();
  if (!user) return;
  const supabase = await createClient();
  await markThreadRead(supabase, threadId, user.id);
  revalidatePath("/coach", "layout");
  revalidatePath("/client", "layout");
}

export async function markMessagesReadById(ids: string[]) {
  if (ids.length === 0) return;
  const user = await getCachedUser();
  if (!user) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .neq("sender_id", user.id);
  if (error) console.error("[server] mark-by-id-read:", error);
  revalidatePath("/coach", "layout");
  revalidatePath("/client", "layout");
}
