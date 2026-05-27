import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth", "/forgot-password"];
const COACH_PREFIX = "/coach";
const CLIENT_PREFIX = "/client";

const isDev = process.env.NODE_ENV === "development";

// Build a per-request CSP that uses a strict nonce for `<script>` tags
// instead of the blanket `'unsafe-inline'`. Next.js 15 picks up the
// `x-nonce` request header and applies the same value to every script
// it emits (RSC streaming, hydration bootstrap). The single inline
// theme-bootstrap script in `app/layout.tsx` reads the same header
// via `next/headers` and stamps the nonce attribute on itself.
//
// `'strict-dynamic'` makes browsers ignore the host list when a
// nonce-trusted script loads further scripts — required because
// Next emits chunked async loads.
function buildCsp(nonce: string, supabaseOrigin: string, supabaseWsOrigin: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Style-src keeps unsafe-inline: every CSS-in-JS lib (Tailwind utility
    // overrides, Radix, inline style={{}}) injects style tags, and
    // nonce-styling them in React is fragile. Lower-risk surface than
    // script-src.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}${isDev ? " http://*:54321 ws://*:54321" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

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

  // CSP — nonce + supabase origins resolved at request time.
  const nonce = generateNonce();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co";
  const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");
  const csp = buildCsp(nonce, supabaseOrigin, supabaseWsOrigin);

  // Make the nonce readable to RSC + the inline theme bootstrap via
  // `next/headers`. This MUST be on the request headers (not response)
  // for Next.js to pick it up.
  request.headers.set("x-nonce", nonce);

  const { response, user, supabase } = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Resolve role. Prefer JWT claim (set by custom_access_token_hook); fall back to DB.
  // Never trust user_metadata — it is user-writable via supabase.auth.updateUser.
  let role: "coach" | "client" | null =
    (user.app_metadata as { user_role?: "coach" | "client" })?.user_role ?? null;
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
