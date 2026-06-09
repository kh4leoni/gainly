"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getThreads, getMessages } from "@/lib/queries/messages";
import { markThreadReadAction, markMessagesReadById } from "@/lib/actions/messages";
import { uuid, avatarHex, nameInitials } from "@/lib/utils";

type Message = { id: string; thread_id: string; sender_id: string; content: string; created_at: string; read_at: string | null };
type Profile = { id: string; full_name: string | null; avatar_url: string | null } | null;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
}

const FI_WEEKDAY = ["sunnuntai", "maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai"];

// Header label between message-day groups. Today / Eilen / weekday for the
// last 6 days / dd.mm.yyyy further back. Capitalized.
function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return "Tänään";
  if (diffDays === 1) return "Eilen";
  if (diffDays < 7) {
    const w = FI_WEEKDAY[d.getDay()] ?? "";
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

// Two consecutive messages count as the same "group" when sent by the same
// person within ~5 min — collapse avatar + timestamp accordingly.
function shouldGroup(
  prev: { sender_id: string; created_at: string } | undefined,
  cur: { sender_id: string; created_at: string } | undefined
): boolean {
  if (!prev || !cur) return false;
  if (prev.sender_id !== cur.sender_id) return false;
  if (!isSameDay(prev.created_at, cur.created_at)) return false;
  const gap = new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap < 5 * 60_000;
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

  // Realtime — append new messages and mark them read server-side if from the other party.
  // No router.refresh: the page is server-rendered with mark-read on initial load,
  // and the action's revalidatePath invalidates the layout's unread count for the
  // next navigation. Refreshing the RSC mid-view causes scroll/render churn.
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
        if (msg.sender_id !== userId) {
          markMessagesReadById([msg.id]).then(() => {
            qc.invalidateQueries({ queryKey: ["unread-count", userId] });
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, qc, supabase, userId]);

  // When the coach picks a different thread, mark that thread's messages read.
  // (Initial-mount mark-read is done server-side in the page.)
  useEffect(() => {
    if (!threadId) return;
    // Zero immediately so the nav badge drops without waiting for the network round-trip.
    qc.setQueryData<number>(["unread-count", userId], 0);
    markThreadReadAction(threadId).then(() => {
      // Refetch to get the accurate count in case other threads still have unread.
      void qc.invalidateQueries({ queryKey: ["unread-count", userId] });
    });
  }, [threadId, qc, userId]);

  type Thread = { id: string; coach_id: string; client_id: string; last_message_at: string | null; coach: Profile; client: Profile };
  const activeThread = (threads.data ?? []).find((t: any) => t.id === threadId) as Thread | undefined;
  const otherProfile: Profile = activeThread
    ? ((activeThread.coach_id === userId ? activeThread.client : activeThread.coach) as Profile)
    : null;

  // ─── Coach layout ───────────────────────────────────────────────────────────
  if (layout === "coach") {
    const color = avatarHex(otherProfile?.full_name ?? null);

    const showSidebar = !isMobile || mobileView === "list";
    const showChat = !isMobile || mobileView === "chat";

    function selectThread(id: string) {
      setThreadId(id);
      if (isMobile) setMobileView("chat");
    }

    return (
      <div className="card-enter" style={{ flex: 1, display: "flex", overflow: "hidden", height: "100%", background: "hsl(var(--background))" }}>

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
              const ac = avatarHex(other?.full_name ?? null);
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
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
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
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg,var(--c-pink),#9B4DCA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff",
            flexShrink: 0,
          }}>
            {nameInitials(otherProfile.full_name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {otherProfile.full_name ?? "Valmentaja"}
            </div>
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
                  borderRadius: "var(--r-xl)",
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
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const isCoach = layout === "coach";

  const otherColor = avatarHex(otherProfile?.full_name ?? null);
  const otherInitials = nameInitials(otherProfile?.full_name ?? null);

  // Track whether user is near the bottom so we don't hijack scroll when reading history.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => {
      atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    return () => list.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll to bottom on new message only if already near bottom; always on thread switch.
  const prevThreadId = useRef(threadId);
  useEffect(() => {
    const switched = prevThreadId.current !== threadId;
    prevThreadId.current = threadId;
    if (switched) atBottom.current = true;
    if (atBottom.current) {
      endRef.current?.scrollIntoView({ behavior: switched ? "instant" : "smooth" });
    }
  }, [messages.length, threadId]);

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

  const inputAreaStyle: React.CSSProperties = {
    padding: isCoach ? "14px 20px" : "12px 16px",
    borderTop: isCoach ? "1px solid hsl(var(--border))" : "1px solid var(--c-border)",
    display: "flex",
    gap: 10,
    alignItems: "center",
    background: isCoach ? "hsl(var(--card))" : "var(--c-surface)",
  };

  // Last own message that the other party has marked as read. Used for the
  // single "Nähty"/check label at the bottom of the own thread, iMessage style.
  const lastOwnReadIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.sender_id === userId && m.read_at) return i;
    }
    return -1;
  })();

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: isCoach ? "hsl(var(--background))" : undefined }}>
      {/* Message list */}
      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: isCoach ? "24px 28px" : "16px 16px 12px" }}>
          {loading && messages.length === 0 && (
            <ChatSkeleton isCoach={isCoach} />
          )}

          {!loading && messages.length === 0 && threadId && (
            <ChatEmptyState isCoach={isCoach} />
          )}

          {messages.map((m, idx) => {
            const isOwn = m.sender_id === userId;
            const prev = messages[idx - 1];
            const next = messages[idx + 1];
            const grouped = shouldGroup(prev, m);
            const groupEnd = !shouldGroup(m, next);
            const showDateSep = !prev || !isSameDay(prev.created_at, m.created_at);
            const isLastReadOwn = idx === lastOwnReadIdx;

            return (
              <div key={m.id}>
                {showDateSep && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    margin: "14px 0 10px",
                    color: isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-subtle)",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>
                    <div style={{ flex: 1, height: 1, background: isCoach ? "hsl(var(--border))" : "var(--c-border)" }} />
                    <span>{formatDateLabel(m.created_at)}</span>
                    <div style={{ flex: 1, height: 1, background: isCoach ? "hsl(var(--border))" : "var(--c-border)" }} />
                  </div>
                )}

                <div style={{
                  display: "flex",
                  justifyContent: isOwn ? "flex-end" : "flex-start",
                  gap: 8,
                  alignItems: "flex-end",
                  marginTop: grouped ? 2 : 8,
                }}>
                  {!isOwn && (
                    groupEnd ? (
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
                    ) : (
                      <div style={{ width: isCoach ? 32 : 28, flexShrink: 0 }} />
                    )
                  )}
                  <div style={{
                    maxWidth: "75%",
                    background: isOwn
                      ? (isCoach ? "#FF1D8C" : "var(--c-pink)")
                      : (isCoach ? "hsl(var(--card))" : "var(--c-surface2)"),
                    border: isOwn
                      ? "none"
                      : (isCoach ? "1px solid hsl(var(--border))" : "1px solid var(--c-border)"),
                    // iOS-style asymmetric bubbles. Outer corner stays 18 only
                    // on the FIRST and LAST message of a group; intermediate
                    // bubbles use a smaller 6 to glue them visually.
                    borderRadius: bubbleRadius(isOwn, !grouped, groupEnd),
                    padding: isCoach ? "9px 14px" : "9px 13px",
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: isOwn
                      ? (isCoach ? "#fff" : "var(--c-pink-fg, #fff)")
                      : (isCoach ? "hsl(var(--foreground))" : "var(--c-text)"),
                    boxShadow: isOwn
                      ? (isCoach ? "0 2px 12px rgba(255,29,140,0.25)" : "0 1px 8px var(--c-pink-glow)")
                      : (isCoach ? "0 1px 3px rgba(0,0,0,0.06)" : "none"),
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {m.content}
                  </div>
                </div>

                {/* Timestamp shown only at the END of a group, beneath the
                    bubble. Less visual noise than per-message timestamps. */}
                {groupEnd && (
                  <div style={{
                    fontSize: 10,
                    color: isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-subtle)",
                    marginTop: 3,
                    marginLeft: isOwn ? 0 : (isCoach ? 40 : 36),
                    marginRight: isOwn ? 2 : 0,
                    textAlign: isOwn ? "right" : "left",
                  }}>
                    {formatTime(m.created_at)}
                  </div>
                )}

                {/* Single "Nähty" tag under the latest own message that the
                    other party has read. */}
                {isLastReadOwn && (
                  <div style={{
                    fontSize: 10,
                    color: isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-subtle)",
                    marginTop: 2,
                    marginRight: 2,
                    textAlign: "right",
                    fontWeight: 600,
                  }}>
                    Nähty
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div style={{
        ...inputAreaStyle,
        flexShrink: 0,
        alignItems: "flex-end",
        // iOS keyboard / home-indicator safe-area on the client shell
        paddingBottom: isCoach ? inputAreaStyle.padding?.toString().split(" ")[0] : `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
      }}>
        <Composer
          value={content}
          onChange={setContent}
          onSubmit={() => void send()}
          isCoach={isCoach}
        />
      </div>
    </div>
  );
}

// Asymmetric corners: bubble is "pinched" toward its tail (right for own,
// left for other) on the first / last bubble of a group, and softens to a
// uniform medium radius for intermediate bubbles.
function bubbleRadius(isOwn: boolean, isGroupStart: boolean, isGroupEnd: boolean): string {
  const big = 18;
  const small = 6;
  const tail = 4;
  if (isOwn) {
    const tr = isGroupStart ? big : small;
    const br = isGroupEnd ? tail : small;
    return `${big}px ${tr}px ${br}px ${big}px`;
  }
  const tl = isGroupStart ? big : small;
  const bl = isGroupEnd ? tail : small;
  return `${tl}px ${big}px ${big}px ${bl}px`;
}

function ChatEmptyState({ isCoach }: { isCoach: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px",
      color: isCoach ? "hsl(var(--muted-foreground))" : "var(--c-text-muted)",
      textAlign: "center",
      gap: 10,
    }}>
      <div style={{ fontSize: 32, opacity: 0.5 }}>💬</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>
        Ei vielä viestejä
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 240 }}>
        Sano hei valmentajallesi tai kysy mitä vain treeniisi liittyen.
      </div>
    </div>
  );
}

function ChatSkeleton({ isCoach }: { isCoach: boolean }) {
  const bg = isCoach ? "hsl(var(--muted))" : "var(--c-surface2)";
  const Row = ({ own, width }: { own: boolean; width: number }) => (
    <div style={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        width, height: 32,
        background: bg,
        borderRadius: own ? "18px 4px 4px 18px" : "4px 18px 18px 4px",
        animation: "msg-pulse 1.4s ease-in-out infinite",
      }} />
    </div>
  );
  return (
    <>
      <style>{`@keyframes msg-pulse { 0%,100% { opacity: 0.6 } 50% { opacity: 0.3 } }`}</style>
      <Row own={false} width={180} />
      <Row own={true}  width={140} />
      <Row own={false} width={220} />
      <Row own={true}  width={90} />
    </>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  isCoach,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isCoach: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Grow with content up to 5 rows (~120px), then scroll.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const trimmed = value.trim();
  return (
    <>
      <textarea
        ref={taRef}
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
        }}
        placeholder="Kirjoita viesti…"
        style={{
          flex: 1,
          minHeight: 38,
          maxHeight: 120,
          resize: "none",
          background: isCoach ? "hsl(var(--background))" : "var(--c-surface2)",
          border: isCoach ? "1.5px solid hsl(var(--border))" : "1px solid var(--c-border)",
          borderRadius: 20,
          padding: "9px 14px",
          color: isCoach ? "hsl(var(--foreground))" : "var(--c-text)",
          fontSize: 14,
          lineHeight: 1.35,
          outline: "none",
          fontFamily: "inherit",
          transition: "border-color 0.2s, box-shadow 0.2s",
          overflowY: "auto",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = isCoach ? "#FF1D8C" : "var(--c-pink)";
          e.target.style.boxShadow = isCoach ? "0 0 0 3px rgba(255,29,140,0.12)" : "0 0 0 3px color-mix(in srgb, var(--c-pink) 12%, transparent)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = isCoach ? "hsl(var(--border))" : "var(--c-border)";
          e.target.style.boxShadow = "none";
        }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!trimmed}
        aria-label="Lähetä viesti"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: trimmed ? (isCoach ? "#FF1D8C" : "var(--c-pink)") : (isCoach ? "hsl(var(--muted))" : "var(--c-surface3)"),
          border: "none",
          cursor: trimmed ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isCoach ? "#fff" : "var(--c-pink-fg, #fff)",
          flexShrink: 0,
          boxShadow: trimmed ? (isCoach ? "0 2px 10px rgba(255,29,140,0.4)" : "0 2px 10px var(--c-pink-glow)") : "none",
          transition: "background 0.15s, opacity 0.15s, transform 0.1s",
          opacity: trimmed ? 1 : 0.45,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l14-7-7 14-2-5-5-2z" />
        </svg>
      </button>
    </>
  );
}
