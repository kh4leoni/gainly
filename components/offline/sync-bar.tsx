"use client";

import { useEffect, useRef, useState } from "react";
import { useUnsyncedCount } from "@/lib/offline/reads";
import { subscribeSyncState, syncNow } from "@/lib/offline/sync";

const MIN_RUNNING_MS = 1000;
const ENTER_MS = 320;
const EXIT_MS = 200;

export function SyncBar() {
  const pending = useUnsyncedCount();
  const [running, setRunning] = useState(false);
  const [online, setOnline] = useState(true);
  const runningStartRef = useRef<number | null>(null);
  const runningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsub = subscribeSyncState((s) => {
      if (s.running) {
        runningStartRef.current = Date.now();
        setRunning(true);
      } else {
        const elapsed = runningStartRef.current ? Date.now() - runningStartRef.current : MIN_RUNNING_MS;
        const remaining = Math.max(0, MIN_RUNNING_MS - elapsed);
        if (runningTimerRef.current) clearTimeout(runningTimerRef.current);
        runningTimerRef.current = setTimeout(() => setRunning(false), remaining);
      }
    });
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      if (runningTimerRef.current) clearTimeout(runningTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      unsub();
    };
  }, []);

  const shouldShow = (pending ?? 0) > 0 || running || !online;

  useEffect(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (shouldShow) {
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      exitTimerRef.current = setTimeout(() => setRendered(false), EXIT_MS);
    }
  }, [shouldShow]);

  if (!rendered) return null;

  const isOffline = !online;
  const canTap = !isOffline && !running && (pending ?? 0) > 0;

  const label = isOffline && (pending ?? 0) === 0
    ? "Offline"
    : isOffline
      ? `${pending} offline`
      : running
        ? "Synkronoidaan…"
        : `${pending} odottaa`;

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <button
        type="button"
        role="status"
        onClick={canTap ? () => void syncNow() : undefined}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px 6px 8px",
          borderRadius: 999,
          background: isOffline ? "#1a1a1f" : "#1c1800",
          border: `1px solid ${isOffline ? "rgba(255,255,255,0.1)" : "rgba(245,166,35,0.35)"}`,
          boxShadow: isOffline
            ? "0 2px 12px rgba(0,0,0,0.4)"
            : "0 2px 12px rgba(245,166,35,0.2)",
          fontSize: 12,
          fontWeight: 700,
          color: isOffline ? "rgba(240,238,245,0.5)" : "#F5A623",
          cursor: canTap ? "pointer" : "default",
          fontFamily: "inherit",
          transformOrigin: "center",
          transform: visible ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0)",
          opacity: visible ? 1 : 0,
          transition: visible
            ? `transform ${ENTER_MS}ms cubic-bezier(0.34,1.56,0.64,1), opacity 150ms ease`
            : `transform ${EXIT_MS}ms cubic-bezier(0.4,0,1,1), opacity ${EXIT_MS}ms ease`,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background: isOffline ? "#555" : "#F5A623",
            animation: running ? "pulse 1.2s ease-in-out infinite" : undefined,
          }}
        />
        {label}
      </button>
    </>
  );
}
