"use client";

import { useEffect, useState } from "react";
import { useUnsyncedCount } from "@/lib/offline/reads";
import { subscribeSyncState, syncNow } from "@/lib/offline/sync";

export function SyncBar() {
  const pending = useUnsyncedCount();
  const [running, setRunning] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsub = subscribeSyncState((s) => setRunning(s.running));
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
    };
  }, []);

  if (pending === 0 && online) return null;

  const label = !online && pending === 0
    ? "Offline-tila"
    : !online
      ? `${pending} merkintää offline-tilassa`
      : running
        ? "Synkronoidaan…"
        : `${pending} synkronoimatonta merkintää`;

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: !online ? "var(--c-surface2)" : "rgba(245,166,35,0.10)",
        borderBottom: "1px solid var(--c-border)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--c-text)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flexShrink: 0,
          background: !online ? "var(--c-text-muted)" : "#F5A623",
          animation: running ? "pulse 1.2s ease-in-out infinite" : undefined,
        }}
      />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <span style={{ flex: 1 }}>{label}</span>
      {pending > 0 && (
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={!online || running}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--c-border)",
            background: !online || running ? "transparent" : "var(--c-pink)",
            color: !online || running ? "var(--c-text-muted)" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: !online || running ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {running ? "…" : "Synkronoi nyt"}
        </button>
      )}
    </div>
  );
}
