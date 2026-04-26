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
    const type = params.get("type");

    async function handle() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setError("Linkki on virheellinen tai vanhentunut.");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }

      if (type === "recovery") {
        router.replace("/auth/update-password");
        return;
      }

      const role =
        (data.session.user.app_metadata as { user_role?: string })?.user_role ??
        (data.session.user.user_metadata as { role?: string })?.role ??
        "client";

      if (type === "invite") {
        router.replace("/auth/update-password");
        return;
      }

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
