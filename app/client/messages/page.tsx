import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getThreads, getMessages } from "@/lib/queries/messages";
import { MessagesView } from "@/components/chat/messages-view";

export const dynamic = "force-dynamic";

export default async function ClientMessages({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const qc = getQueryClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const threads = await getThreads(supabase, user.user.id);
  const threadId = sp.thread ?? threads[0]?.id ?? null;

  await qc.prefetchQuery({ queryKey: ["threads", user.user.id], queryFn: () => Promise.resolve(threads) });
  if (threadId) {
    await qc.prefetchQuery({ queryKey: ["messages", threadId], queryFn: () => getMessages(supabase, threadId) });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <MessagesView userId={user.user.id} initialThreadId={threadId} />
    </HydrationBoundary>
  );
}
