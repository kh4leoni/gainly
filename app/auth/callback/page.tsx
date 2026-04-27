"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const errorDescription = params.get("error_description");

    async function handle() {
      if (errorDescription) {
        setError("Linkki on virheellinen tai vanhentunut.");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }

      let session = null;

      if (accessToken && refreshToken) {
        const { data, error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setErr || !data.session) {
          setError("Linkki on virheellinen tai vanhentunut.");
          setTimeout(() => router.push("/login"), 1500);
          return;
        }
        session = data.session;
      } else {
        const { data, error: getErr } = await supabase.auth.getSession();
        if (getErr || !data.session) {
          setError("Linkki on virheellinen tai vanhentunut.");
          setTimeout(() => router.push("/login"), 1500);
          return;
        }
        session = data.session;
      }

      if (typeof window !== "undefined" && window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      if (type === "recovery" || type === "invite") {
        router.replace("/auth/update-password");
        return;
      }

      const role =
        (session.user.app_metadata as { user_role?: string })?.user_role ??
        (session.user.user_metadata as { role?: string })?.role ??
        "client";

      router.replace(role === "coach" ? "/coach/dashboard" : "/client/dashboard");
    }

    handle();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground">{error ?? "Vahvistetaan…"}</p>
    </div>
  );
}
