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

export async function getMessages(supabase: DB, threadId: string, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_id, sender_id, content, created_at, read_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  // return oldest-first for rendering
  return (data ?? []).reverse();
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
