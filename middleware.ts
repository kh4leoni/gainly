import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth", "/forgot-password"];
const COACH_PREFIX = "/coach";
const CLIENT_PREFIX = "/client";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes we don't protect here
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/workbox-") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const { response, user, supabase } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Resolve role. Prefer JWT claim (set by custom_access_token_hook); fall back to DB.
  let role: "coach" | "client" | null =
    (user.app_metadata as any)?.user_role ?? (user.user_metadata as any)?.role ?? null;
  if (!role) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = (data as { role: "coach" | "client" } | null)?.role ?? null;
  }

  // Authenticated user hitting "/" → redirect to role home
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = role === "coach" ? "/coach/dashboard" : "/client/dashboard";
    return NextResponse.redirect(url);
  }

  // Guard role-specific prefixes
  if (pathname.startsWith(COACH_PREFIX) && role !== "coach") {
    const url = request.nextUrl.clone();
    url.pathname = "/client/dashboard";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith(CLIENT_PREFIX) && role !== "client") {
    const url = request.nextUrl.clone();
    url.pathname = "/coach/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4)$).*)"],
};
