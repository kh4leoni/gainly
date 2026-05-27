import { NextResponse } from "next/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubscribePayload = {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
  user_agent?: unknown;
};

// Lightweight CSRF defence: any state-changing request to this endpoint
// must come from our own origin. Browsers always set `Origin` on POST/
// DELETE (or `Sec-Fetch-Site: same-origin` for fetch requests). Combined
// with the `SameSite=Lax` cookies Supabase ships, this closes the
// remaining sub-domain-redirect vector for CSRF.
function rejectIfCrossOrigin(req: Request): NextResponse | null {
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "none") {
    return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
  }
  const origin = req.headers.get("origin");
  if (origin) {
    const allowed = process.env.NEXT_PUBLIC_SITE_URL;
    if (allowed && origin !== new URL(allowed).origin) {
      return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
    }
  }
  return null;
}

export async function POST(req: Request) {
  const csrf = rejectIfCrossOrigin(req);
  if (csrf) return csrf;
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
  // Look up any existing row for this endpoint first. If it belongs to a
  // different user, refuse the takeover — the legitimate owner of that
  // endpoint must unsubscribe from their device before another account
  // can claim it. Without this, an attacker who learned an endpoint URL
  // (eg. server-log leak) could redirect another user's push stream to
  // their own browser.
  const { data: existing, error: lookupErr } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });

  if (existing && existing.user_id !== user.id) {
    return NextResponse.json(
      { error: "endpoint already claimed by another account" },
      { status: 409 }
    );
  }

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
  const csrf = rejectIfCrossOrigin(req);
  if (csrf) return csrf;
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
