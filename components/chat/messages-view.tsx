"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getThreads, getMessages } from "@/lib/queries/messages";
import { uuid } from "@/lib/utils";

type Message = { id: string; thread_id: string; sender_id: string; content: string; created_at: string; read_at: string | null };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
}

export function MessagesView({ userId, initialThreadId, layout = "client" }: { userId: string; initialThreadId: string | null; layout?: "coach" | "client" }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);

  const threads = useQuery({
    queryKey: ["threads", userId],
    queryFn: () => getThreads(supabase, userId),
    staleTime: 30_000,
  });

  const messages = useQuery({
    queryKey: ["messages", threadId],
    enabled: !!threadId,
    queryFn: () => getMessages(supabase, threadId!),
  });

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        const msg = payload.new as Message;
        qc.setQueryData<Message[]>(["messages", threadId], (old = []) => {
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, qc, supabase]);

  // Mark read
  useEffect(() => {
    if (!threadId || !messages.data) return;
    const unread = messages.data.filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    void supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
  }, [threadId, messages.data, userId, supabase]);

  type Profile = { id: string; full_name: string | null; avatar_url: string | null } | null;
  type Thread = { id: string; coach_id: string; client_id: string; last_message_at: string | null; coach: Profile; client: Profile };
  const activeThread = (threads.data ?? []).find((t: any) => t.id === threadId) as Thread | undefined;
  const coachProfile: Profile = activeThread
    ? ((activeThread.coach_id === userId ? activeThread.client : activeThread.coach) as Profile)
    : null;

  // Coach layout: sidebar (thread list) + chat side-by-side
  if (layout === "coach") {
    return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "100%" }}>
        {/* Thread list sidebar */}
        <div style={{
          width: 240,
          borderRight: "1px solid var(--c-border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          background: "var(--c-surface)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--c-border)", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Asiakkaat</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {(threads.data ?? []).map((t: any) => {
              const other = (t.coach_id === userId ? t.client : t.coach) as Profile;
              const active = t.id === threadId;
              const initials = (other?.full_name ?? "?").slice(0, 2).toUpperCase();
              return (
                <button
                  key={t.id}
                  onClick={() => setThreadId(t.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    background: active ? "var(--c-pink-dim)" : "transparent",
                    border: "none",
                    borderLeft: active ? "2px solid var(--c-pink)" : "2px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: active ? "var(--c-pink)" : "var(--c-surface2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--c-pink)" : "var(--c-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {other?.full_name ?? "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat header */}
          {coachProfile ? (
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--c-border)",
              display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "var(--c-surface)",
            }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg,var(--c-pink),#9B4DCA)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "#fff",
                }}>
                  {(coachProfile.full_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{coachProfile.full_name ?? "—"}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>asiakas</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", fontSize: 14, fontWeight: 700, flexShrink: 0, background: "var(--c-surface)" }}>
              Viestit
            </div>
          )}
          <ChatPane
            threadId={threadId}
            userId={userId}
            messages={messages.data ?? []}
            loading={messages.isLoading}
          />
        </div>
      </div>
    );
  }

  // Client layout: stacked vertical
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      {coachProfile ? (
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--c-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          background: "var(--c-surface)",
        }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg,var(--c-pink),#9B4DCA)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff",
            }}>
              {(coachProfile.full_name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div style={{
              position: "absolute", bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: "50%",
              background: "var(--c-green)",
              border: "2px solid var(--c-bg)",
              animation: "c-pulse 2s infinite",
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{coachProfile.full_name ?? "Valmentaja"}</div>
            <div style={{
              fontSize: 12,
              fontFamily: "var(--font-dancing)",
              fontWeight: 700,
              color: "var(--c-pink)",
              marginTop: 1,
              lineHeight: 1,
            }}>
              valmentaja
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--c-green)" }}>● Online</div>
        </div>
      ) : (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border)", fontSize: 14, fontWeight: 700, flexShrink: 0, background: "var(--c-surface)" }}>
          Viestit
        </div>
      )}

      {/* Thread selector (if multiple threads) */}
      {(threads.data ?? []).length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--c-border)", overflowX: "auto", flexShrink: 0 }}>
          {(threads.data ?? []).map((t: any) => {
            const other = (t.coach_id === userId ? t.client : t.coach) as Profile;
            const active = t.id === threadId;
            return (
              <button
                key={t.id}
                onClick={() => setThreadId(t.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${active ? "var(--c-pink)" : "var(--c-border)"}`,
                  background: active ? "var(--c-pink-dim)" : "var(--c-surface)",
                  color: active ? "var(--c-pink)" : "var(--c-text-muted)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {other?.full_name ?? "—"}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <ChatPane
        threadId={threadId}
        userId={userId}
        messages={messages.data ?? []}
        loading={messages.isLoading}
      />
    </div>
  );
}

function ChatPane({
  threadId,
  userId,
  messages,
  loading,
}: {
  threadId: string | null;
  userId: string;
  messages: Message[];
  loading: boolean;
}) {
  const qc = useQueryClient();
  const supabase = createClient();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = content.trim();
    if (!text || !threadId) return;
    const id = uuid();
    const optimistic: Message = {
      id, thread_id: threadId, sender_id: userId, content: text,
      created_at: new Date().toISOString(), read_at: null,
    };
    qc.setQueryData<Message[]>(["messages", threadId], (old = []) => [...old, optimistic]);
    setContent("");
    const { error } = await supabase.from("messages").insert({
      id, thread_id: threadId, sender_id: userId, content: text,
    });
    if (error) {
      // Roll back optimistic update on failure.
      qc.setQueryData<Message[]>(["messages", threadId], (old = []) => old.filter((m) => m.id !== id));
    }
  }

  if (!threadId) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-text-muted)", fontSize: 14 }}>
        Ei viestejä vielä.
      </div>
    );
  }

  return (
    <>
      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && (
          <div style={{ textAlign: "center", color: "var(--c-text-subtle)", fontSize: 13 }}>Ladataan...</div>
        )}
        {messages.map((m) => {
          const isOwn = m.sender_id === userId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
              {!isOwn && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg,var(--c-pink),#9B4DCA)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>
                  FS
                </div>
              )}
              <div style={{
                maxWidth: "72%",
                background: isOwn ? "var(--c-pink)" : "var(--c-surface2)",
                border: isOwn ? "none" : "1px solid var(--c-border)",
                borderRadius: isOwn ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.5,
                color: isOwn ? "#fff" : "var(--c-text)",
                boxShadow: isOwn ? "0 0 16px var(--c-pink-glow)" : "none",
              }}>
                <div>{m.content}</div>
                <div style={{ fontSize: 10, color: isOwn ? "rgba(255,255,255,0.6)" : "var(--c-text-subtle)", marginTop: 3, textAlign: isOwn ? "right" : "left" }}>
                  {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--c-border)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexShrink: 0,
        background: "var(--c-surface)",
      }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Kirjoita viesti..."
          style={{
            flex: 1,
            background: "var(--c-surface2)",
            border: "1px solid var(--c-border)",
            borderRadius: 24,
            padding: "11px 16px",
            color: "var(--c-text)",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--c-pink)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--c-border)")}
        />
        <button
          onClick={() => void send()}
          disabled={!content.trim()}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: content.trim() ? "var(--c-pink)" : "var(--c-surface3)",
            border: "none", cursor: content.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
            boxShadow: content.trim() ? "0 0 16px var(--c-pink-glow)" : "none",
            transition: "all 0.2s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </>
  );
}
