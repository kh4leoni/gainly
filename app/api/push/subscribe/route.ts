import { NextResponse } from "next/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubscribePayload = {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
  user_agent?: unknown;
};

export async function POST(req: Request) {
  const user = await getCachedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: SubscribePayload;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh   = typeof body.p256dh   === "string" ? body.p256dh   : "";
  const auth     = typeof body.auth     === "string" ? body.auth     : "";
  const ua       = typeof body.user_agent === "string" ? body.user_agent.slice(0, 500) : null;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = await createClient();
  // Endpoint is globally unique. If it already exists, take it over for
  // the current user (e.g. someone else used to be logged in on this device).
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth, user_agent: ua, last_seen_at: new Date().toISOString() },
      { onConflict: "endpoint" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCachedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { endpoint?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
