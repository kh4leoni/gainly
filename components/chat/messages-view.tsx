"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getThreads, getMessages } from "@/lib/queries/messages";
import { uuid } from "@/lib/utils";

type Message = { id: string; thread_id: string; sender_id: string; content: string; created_at: string; read_at: string | null };
type Profile = { id: string; full_name: string | null; avatar_url: string | null } | null;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
}

function avatarColor(name: string | null): string {
  const palette = ["#ec4899", "#f97316", "#8b5cf6", "#14b8a6", "#6366f1", "#f43f5e", "#10b981", "#f59e0b"];
  if (!name) return "#ec4899";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length] ?? "#ec4899";
}

function nameInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function MessagesView({ userId, initialThreadId, layout = "client" }: { userId: string; initialThreadId: string | null; layout?: "coach" | "client" }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">(initialThreadId ? "chat" : "list");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  type Thread = { id: string; coach_id: string; client_id: string; last_message_at: string | null; coach: Profile; client: Profile };
  const activeThread = (threads.data ?? []).find((t: any) => t.id === threadId) as Thread | undefined;
  const otherProfile: Profile = activeThread
    ? ((activeThread.coach_id === userId ? activeThread.client : activeThread.coach) as Profile)
    : null;

  // ─── Coach layout ───────────────────────────────────────────────────────────
  if (layout === "coach") {
    const color = avatarColor(otherProfile?.full_name ?? null);

    const showSidebar = !isMobile || mobileView === "list";
    const showChat = !isMobile || mobileView === "chat";

    function selectThread(id: string) {
      setThreadId(id);
      if (isMobile) setMobileView("chat");
    }

    return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "100%", background: "hsl(var(--background))" }}>

        {/* ── Thread list sidebar ── */}
        {showSidebar && <div style={{
          width: isMobile ? "100%" : 260,
          borderRight: isMobile ? "none" : "1px solid hsl(var(--border))",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          background: "hsl(var(--card))",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "18px 16px 14px",
            borderBottom: "1px solid hsl(var(--border))",
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: "hsl(var(--muted-foreground))",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Asiakkaat
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {(threads.data ?? []).length === 0 && (
              <div style={{ padding: "24px 16px", fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
                Ei asiakkaita vielä
              </div>
            )}
            {(threads.data ?? []).map((t: any) => {
              const other = (t.coach_id === userId ? t.client : t.coach) as Profile;
              const active = t.id === threadId;
              const ac = avatarColor(other?.full_name ?? null);
              return (
                <button
                  key={t.id}
                  onClick={() => selectThread(t.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 16px",
                    background: active ? "hsl(var(--accent))" : "transparent",
                    border: "none",
                    borderLeft: active ? "2px solid #FF1D8C" : "2px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: active ? ac : ac + "cc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: active ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${ac}55` : "none",
                    transition: "box-shadow 0.15s",
                  }}>
                    {nameInitials(other?.full_name ?? null)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {other?.full_name ?? "—"}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 1,
                    }}>
                      asiakas
                    </div>
                  </div>
                  {active && (
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#FF1D8C",
                      flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>}

        {/* ── Chat area ── */}
        {showChat && <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "hsl(var(--background))" }}>

          {/* Chat header */}
          {otherProfile ? (
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              gap: 13,
              flexShrink: 0,
              background: "hsl(var(--card))",
            }}>
              {isMobile && (
                <button
                  onClick={() => setMobileView("list")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 4px 4px 0", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", flexShrink: 0 }}
                  aria-label="Takaisin"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
              )}
              <div style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                flexShrink: 0,
                boxShadow: `0 2px 8px ${color}55`,
              }}>
                {nameInitials(otherProfile.full_name)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "hsl(var(--foreground))" }}>
                  {otherProfile.full_name ?? "—"}
                </div>
                <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>asiakas</div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid hsl(var(--border))",
              fontSize: 15,
              fontWeight: 700,
              flexShrink: 0,
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}>
              Viestit
            </div>
          )}

          <ChatPane
            threadId={threadId}
            userId={userId}
            messages={messages.data ?? []}
            loading={messages.isLoading}
            otherProfile={otherProfile}
            layout="coach"
          />
        </div>}
      </div>
    );
  }

  // ─── Client layout ───────────────────────────────────────────────────────────
  const repaintRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = repaintRef.current;
    if (!el) return;
    // After page-transition animation completes (~260ms), force iOS Safari repaint
    const t = setTimeout(() => {
      if (!el) return;
      el.style.opacity = "0.9999";
      requestAnimationFrame(() => { if (el) el.style.opacity = ""; });
    }, 320);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={repaintRef} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
      {/* Header */}
      {otherProfile ? (
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
              {nameInitials(otherProfile.full_name)}
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
            <div style={{ fontWeight: 700, fontSize: 15 }}>{otherProfile.full_name ?? "Valmentaja"}</div>
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

      <ChatPane
        threadId={threadId}
        userId={userId}
        messages={messages.data ?? []}
        loading={messages.isLoading}
        otherProfile={otherProfile}
        layout="client"
      />
    </div>
  );
}

function ChatPane({
  threadId,
  userId,
  messages,
  loading,
  otherProfile,
  layout = "client",
}: {
  threadId: string | null;
  userId: string;
  messages: Message[];
  loading: boolean;
  otherProfile?: Profile | null;
  layout?: "coach" | "client";
}) {
  const qc = useQueryClient();
  const supabase = createClient();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const isCoach = layout === "coach";

  const otherColor = avatarColor(otherProfile?.full_name ?? null);
  const otherInitials = nameInitials(otherProfile?.full_name ?? null);

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
      qc.setQueryData<Message[]>(["messages", threadId], (old = []) => old.filter((m) => m.id !== id));
    }
  }

  if (!threadId) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-muted)",
        fontSize: 14,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span style={{ opacity: 0.6 }}>Valitse asiakas aloittaaksesi</span>
      </div>
    );
  }

  const msgListStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: isCoach ? "24px 28px" : "20px",
    display: "flex",
    flexDirection: "column",
    gap: isCoach ? 12 : 10,
    background: isCoach ? "hsl(var(--background))" : undefined,
    WebkitTransform: "translateZ(0)",
    transform: "translateZ(0)",
  };

  const inputAreaStyle: React.CSSProperties = {
    padding: isCoach ? "14px 20px" : "12px 16px",
    borderTop: isCoach ? "1px solid hsl(var(--border))" : "1px solid var(--c-border)",
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexShrink: 0,
    background: isCoach ? "hsl(var(--card))" : "var(--c-surface)",
  };

  return (
    <>
      {/* Message list */}
      <div style={msgListStyle}>
        {loading && (
          <div style={{ textAlign: "center", color: isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-muted)", fontSize: 13 }}>
            Ladataan...
          </div>
        )}
        {messages.map((m) => {
          const isOwn = m.sender_id === userId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
              {!isOwn && (
                <div style={{
                  width: isCoach ? 32 : 28,
                  height: isCoach ? 32 : 28,
                  borderRadius: "50%",
                  background: isCoach ? otherColor : "linear-gradient(135deg,var(--c-pink),#9B4DCA)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isCoach ? 11 : 10,
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                  boxShadow: isCoach ? `0 1px 4px ${otherColor}55` : "none",
                }}>
                  {isCoach ? otherInitials : nameInitials(otherProfile?.full_name ?? null)}
                </div>
              )}
              <div style={{
                maxWidth: "72%",
                background: isOwn
                  ? (isCoach ? "#FF1D8C" : "var(--c-pink)")
                  : (isCoach ? "hsl(var(--card))" : "var(--c-surface2)"),
                border: isOwn
                  ? "none"
                  : (isCoach ? "1px solid hsl(var(--border))" : "1px solid var(--c-border)"),
                borderRadius: isOwn ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                padding: isCoach ? "10px 15px" : "10px 14px",
                fontSize: 13,
                lineHeight: 1.5,
                color: isOwn
                  ? "#fff"
                  : (isCoach ? "hsl(var(--foreground))" : "var(--c-text)"),
                boxShadow: isOwn
                  ? (isCoach ? "0 2px 12px rgba(255,29,140,0.35)" : "0 0 16px var(--c-pink-glow)")
                  : (isCoach ? "0 1px 3px rgba(0,0,0,0.06)" : "none"),
              }}>
                <div>{m.content}</div>
                <div style={{
                  fontSize: 10,
                  color: isOwn
                    ? "rgba(255,255,255,0.65)"
                    : (isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-subtle)"),
                  marginTop: 3,
                  textAlign: isOwn ? "right" : "left",
                }}>
                  {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={inputAreaStyle}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Kirjoita viesti..."
          style={{
            flex: 1,
            background: isCoach ? "hsl(var(--background))" : "var(--c-surface2)",
            border: isCoach ? "1.5px solid hsl(var(--border))" : "1px solid var(--c-border)",
            borderRadius: 24,
            padding: isCoach ? "10px 18px" : "11px 16px",
            color: isCoach ? "hsl(var(--foreground))" : "var(--c-text)",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#FF1D8C";
            e.target.style.boxShadow = "0 0 0 3px rgba(255,29,140,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = isCoach ? "hsl(var(--border))" : "var(--c-border)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!content.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: content.trim() ? "#FF1D8C" : (isCoach ? "hsl(var(--muted))" : "var(--c-surface3)"),
            border: "none",
            cursor: content.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
            boxShadow: content.trim() ? "0 2px 12px rgba(255,29,140,0.4)" : "none",
            transition: "all 0.18s",
            opacity: content.trim() ? 1 : 0.45,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </>
  );
}
