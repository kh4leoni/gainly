"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellSlash } from "@phosphor-icons/react";
import {
  getActiveSubscription,
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { setPushMessagesPref } from "@/lib/actions/push-prefs";
import { createClient } from "@/lib/supabase/client";

type Variant = "client" | "coach";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function PushMessagesToggle({ variant = "client", bare = false }: { variant?: Variant; bare?: boolean }) {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = isPushSupported();
      if (!ok) {
        setSupported(false);
        setLoaded(true);
        return;
      }
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { setLoaded(true); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("push_messages")
        .eq("id", uid)
        .maybeSingle();
      const sub = await getActiveSubscription();
      const perm = getNotificationPermission();
      if (cancelled) return;
      const on =
        !!profile?.push_messages &&
        perm === "granted" &&
        !!sub;
      setEnabled(on);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  function toggle() {
    if (busy) return;
    setError(null);
    const next = !enabled;
    startTransition(async () => {
      try {
        if (next) {
          if (!VAPID_PUBLIC_KEY) throw new Error("Push-tausta ei ole määritetty");
          await subscribeToPush(VAPID_PUBLIC_KEY);
          await setPushMessagesPref(true);
        } else {
          await unsubscribeFromPush();
          await setPushMessagesPref(false);
        }
        setEnabled(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Tuntematon virhe";
        setError(msg);
      }
    });
  }

  if (!loaded) return null;

  const labelColor =
    variant === "coach" ? "hsl(var(--muted-foreground))" : "var(--c-text-subtle)";
  const iconColor =
    variant === "coach" ? "hsl(var(--primary))" : "var(--c-pink)";
  const dimColor =
    variant === "coach" ? "hsl(var(--muted-foreground))" : "var(--c-text-subtle)";

  if (!supported) {
    return (
      <div style={{ padding: bare ? 0 : "11px 16px" }}>
        <p style={{ fontSize: 11, color: dimColor, lineHeight: 1.4 }}>
          Ilmoituksia ei tueta tällä laitteella. iOS:llä lisää sovellus aloitusnäytölle (Jaa → Lisää aloitusnäyttöön).
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: bare ? 0 : "11px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor }}>
          Viesti-ilmoitukset
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BellSlash size={14} color={!enabled ? iconColor : dimColor} weight={!enabled ? "fill" : "regular"} />
          <button
            role="switch"
            aria-checked={enabled}
            onClick={toggle}
            disabled={busy}
            className="ios-toggle"
            data-on={enabled ? "1" : "0"}
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            <span className="ios-toggle-thumb" />
          </button>
          <Bell size={14} color={enabled ? iconColor : dimColor} weight={enabled ? "fill" : "regular"} />
        </div>
      </div>
      {error && (
        <p style={{ marginTop: 6, fontSize: 11, color: "var(--c-danger, #ef4444)" }}>{error}</p>
      )}
    </div>
  );
}
