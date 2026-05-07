import type { DB } from "./types";

export async function getThreads(supabase: DB, userId: string) {
  const { data, error } = await supabase
    .from("threads")
    .select(`
      id, last_message_at, coach_id, client_id,
      coach:profiles!coach_id  ( id, full_name, avatar_url ),
      client:profiles!client_id ( id, full_name, avatar_url )
    `)
    .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMessages(supabase: DB, threadId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_id, sender_id, content, created_at, read_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUnreadCount(supabase: DB, userId: string) {
  // Messages sent by the *other* participant and not yet read.
  const { count, error } = await supabase
    .from("messages")
    .select("id, threads!inner(coach_id, client_id)", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function getMostRecentUnreadThreadId(supabase: DB, userId: string) {
  const { data } = await supabase
    .from("messages")
    .select("thread_id")
    .is("read_at", null)
    .neq("sender_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.thread_id ?? null;
}

export async function markThreadRead(supabase: DB, threadId: string, userId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .is("read_at", null)
    .neq("sender_id", userId);
  if (error) console.error("[markThreadRead]", error);
}

export async function markAllRead(supabase: DB, userId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .neq("sender_id", userId);
  if (error) console.error("[markAllRead]", error);
}

export async function ensureThread(supabase: DB, coachId: string, clientId: string) {
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("threads")
    .insert({ coach_id: coachId, client_id: clientId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
