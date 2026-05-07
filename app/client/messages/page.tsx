import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getThreads, getMessages, markAllRead } from "@/lib/queries/messages";
import { MessagesView } from "@/components/chat/messages-view";

export const dynamic = "force-dynamic";

export default async function ClientMessages({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const qc = getQueryClient();

  await markAllRead(supabase, user.id);

  const threads = await getThreads(supabase, user.id);
  const threadId = sp.thread ?? threads[0]?.id ?? null;

  await qc.prefetchQuery({ queryKey: ["threads", user.id], queryFn: () => Promise.resolve(threads) });
  if (threadId) {
    await qc.prefetchQuery({ queryKey: ["messages", threadId], queryFn: () => getMessages(supabase, threadId) });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <MessagesView userId={user.id} initialThreadId={threadId} />
    </HydrationBoundary>
  );
}
