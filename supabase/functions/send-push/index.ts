// Send a Web Push notification to every device subscribed to the
// recipient of a freshly-inserted message.
//
// Invoked by the `messages_notify_push` trigger via pg_net. Auth is a
// shared secret (`x-push-secret` header) — we set `verify_jwt = false`
// in config.toml because the caller is the database itself.
//
// Required env (set via `supabase functions secrets set`):
//   PUSH_FUNCTION_SECRET      — must match app.push_function_secret in DB
//   VAPID_PUBLIC_KEY          — base64url, also exposed to client as NEXT_PUBLIC_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY         — base64url
//   VAPID_SUBJECT             — e.g. "mailto:hello@gainly.app"
//   APP_ORIGIN                — used to build the click-through URL (e.g. "https://app.gainly.app")

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUSH_SECRET  = Deno.env.get("PUSH_FUNCTION_SECRET") ?? "";
const VAPID_PUB    = Deno.env.get("VAPID_PUBLIC_KEY")  ?? "";
const VAPID_PRIV   = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJ   = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@gainly.app";
const APP_ORIGIN   = Deno.env.get("APP_ORIGIN") ?? "";

if (VAPID_PUB && VAPID_PRIV) {
  webpush.setVapidDetails(VAPID_SUBJ, VAPID_PUB, VAPID_PRIV);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!VAPID_PUB || !VAPID_PRIV) {
    return json({ error: "vapid not configured" }, 500);
  }

  let body: { message_id?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const messageId = body.message_id;
  if (!messageId) return json({ error: "missing message_id" }, 400);

  // Load the message + thread participants.
  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .select("id, thread_id, sender_id, content, threads!inner(coach_id, client_id)")
    .eq("id", messageId)
    .single();
  if (msgErr || !msg) return json({ error: "message not found" }, 404);

  // @ts-expect-error nested join shape
  const thread: { coach_id: string; client_id: string } = msg.threads;
  const recipientId = thread.coach_id === msg.sender_id ? thread.client_id : thread.coach_id;
  if (recipientId === msg.sender_id) return json({ skipped: "self" });

  // Check recipient preference + role and load sender display name in parallel.
  // Role decides which shell the notification deep-links into — coaches
  // mustn't be sent to /client/messages or vice versa.
  const [{ data: recipient }, { data: sender }] = await Promise.all([
    admin.from("profiles").select("push_messages, role").eq("id", recipientId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", msg.sender_id).maybeSingle(),
  ]);
  if (!recipient?.push_messages) return json({ skipped: "opted_out" });

  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", recipientId);
  if (subErr) return json({ error: subErr.message }, 500);
  if (!subs || subs.length === 0) return json({ skipped: "no_subs" });

  const senderName = sender?.full_name?.trim() || "Uusi viesti";
  const preview = (msg.content ?? "").slice(0, 140);
  const messagesPath = recipient.role === "coach"
    ? `/coach/messages?thread=${msg.thread_id}`
    : `/client/messages?thread=${msg.thread_id}`;
  const target = APP_ORIGIN ? `${APP_ORIGIN}${messagesPath}` : messagesPath;

  const payload = JSON.stringify({
    title: senderName,
    body: preview,
    url: target,
    tag: `thread-${msg.thread_id}`,
    messageId: msg.id,
  });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  // Drop dead subscriptions (410 Gone, 404 Not Found).
  const deadIds: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const status = (r.reason as { statusCode?: number } | undefined)?.statusCode;
      if (status === 410 || status === 404) {
        const sub = subs[i];
        if (sub) deadIds.push(sub.id);
      } else {
        console.error("push send failed", r.reason);
      }
    }
  });
  if (deadIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", deadIds);
  }

  return json({
    sent: results.filter((r) => r.status === "fulfilled").length,
    dead: deadIds.length,
  });
});
