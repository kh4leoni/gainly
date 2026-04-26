import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "recovery" | "invite" | "signup" | null;
  const next = searchParams.get("next") ?? "/";

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, base));
  }

  return NextResponse.redirect(new URL(next, base));
}
