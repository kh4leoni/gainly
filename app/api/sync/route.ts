import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-side replay endpoint: used if the SW needs to hand off to a server context
// (e.g. large payloads or atomic multi-row writes). Client usually replays directly to Supabase.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // This endpoint intentionally just acknowledges - the client performs the actual replay.
  // It exists so that we have a place to implement server-side batching if needed.
  return NextResponse.json({ ok: true, received: body.items.length });
}
