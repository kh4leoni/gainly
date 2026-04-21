"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getThreads, getMessages } from "@/lib/queries/messages";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, relativeTime, uuid } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { enqueue } from "@/lib/offline/queue";
import { replay } from "@/lib/offline/sync";

type Message = { id: string; thread_id: string; sender_id: string; content: string; created_at: string; read_at: string | null };

export function MessagesView({ userId, initialThreadId }: { userId: string; initialThreadId: string | null }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);

  const threads = useQuery({
    queryKey: ["threads", userId],
    queryFn: () => getThreads(supabase, userId),
  });

  const messages = useQuery({
    queryKey: ["messages", threadId],
    enabled: !!threadId,
    queryFn: () => getMessages(supabase, threadId!),
  });

  // Realtime subscribe on thread change.
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as Message;
          qc.setQueryData<Message[]>(["messages", threadId], (old = []) => {
            if (old.some((m) => m.id === msg.id)) return old;
            return [...old, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc, supabase]);

  // Mark unread messages (not from me) as read when viewing.
  useEffect(() => {
    if (!threadId || !messages.data) return;
    const unread = messages.data.filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    void supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
  }, [threadId, messages.data, userId, supabase]);

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] md:grid-cols-[280px_1fr]">
      {/* Threads list */}
      <aside className="border-b md:border-b-0 md:border-r">
        <ul>
          {(threads.data ?? []).map((t: any) => {
            const other = t.coach_id === userId ? t.client : t.coach;
            return (
              <li key={t.id}>
                <button
                  onClick={() => setThreadId(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b px-3 py-2 text-left hover:bg-accent",
                    threadId === t.id && "bg-accent"
                  )}
                >
                  <Avatar>
                    <AvatarFallback>{(other?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{other?.full_name ?? "—"}</div>
                    {t.last_message_at && (
                      <div className="truncate text-xs text-muted-foreground">{relativeTime(t.last_message_at)}</div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {(threads.data ?? []).length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">No conversations yet.</li>
          )}
        </ul>
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 flex-col">
        {threadId ? (
          <ChatPane threadId={threadId} userId={userId} messages={messages.data ?? []} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
        )}
      </section>
    </div>
  );
}

function ChatPane({
  threadId,
  userId,
  messages,
}: {
  threadId: string;
  userId: string;
  messages: Message[];
}) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = content.trim();
    if (!text) return;
    const id = uuid();
    const optimistic: Message = {
      id, thread_id: threadId, sender_id: userId, content: text,
      created_at: new Date().toISOString(), read_at: null,
    };
    qc.setQueryData<Message[]>(["messages", threadId], (old = []) => [...old, optimistic]);
    setContent("");
    await enqueue("message.send", { id, thread_id: threadId, sender_id: userId, content: text }, id);
    if (navigator.onLine) await replay();
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {messages.map((m) => (
            <Card
              key={m.id}
              className={cn(
                "max-w-[80%] whitespace-pre-wrap p-2 text-sm shadow-none",
                m.sender_id === userId ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"
              )}
            >
              {m.content}
            </Card>
          ))}
          <div ref={endRef} />
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t p-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type a message…" />
          <Button type="submit" disabled={!content.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}
