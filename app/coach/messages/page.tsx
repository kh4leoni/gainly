import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getThreads, getMessages, ensureThread } from "@/lib/queries/messages";
import { MessagesView } from "@/components/chat/messages-view";

export const dynamic = "force-dynamic";

export default async function CoachMessages({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; with?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const qc = getQueryClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  let threadId = sp.thread ?? null;
  if (!threadId && sp.with) {
    threadId = await ensureThread(supabase, user.user.id, sp.with);
  }

  const threads = await getThreads(supabase, user.user.id);
  threadId = threadId ?? threads[0]?.id ?? null;

  await qc.prefetchQuery({ queryKey: ["threads", user.user.id], queryFn: () => Promise.resolve(threads) });
  if (threadId) {
    await qc.prefetchQuery({ queryKey: ["messages", threadId], queryFn: () => getMessages(supabase, threadId!) });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <MessagesView userId={user.user.id} initialThreadId={threadId} layout="coach" />
    </HydrationBoundary>
  );
}
