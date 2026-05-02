"use client";

import { useEffect, useRef, useState } from "react";
import { useUnsyncedCount } from "@/lib/offline/reads";
import { subscribeSyncState, syncNow } from "@/lib/offline/sync";

const MIN_RUNNING_MS = 1000;
const SYNCED_LINGER_MS = 2000;
const ENTER_MS = 320;
const EXIT_MS = 200;

export function SyncBar() {
  const pending = useUnsyncedCount();
  const [running, setRunning] = useState(false);
  const [synced, setSynced] = useState(false);
  const [online, setOnline] = useState(true);
  const runningStartRef = useRef<number | null>(null);
  const runningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
        setSynced(false);
        setRunning(true);
      } else {
        const elapsed = runningStartRef.current ? Date.now() - runningStartRef.current : MIN_RUNNING_MS;
        const remaining = Math.max(0, MIN_RUNNING_MS - elapsed);
        if (runningTimerRef.current) clearTimeout(runningTimerRef.current);
        runningTimerRef.current = setTimeout(() => {
          setRunning(false);
          setSynced(true);
          if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
          syncedTimerRef.current = setTimeout(() => setSynced(false), SYNCED_LINGER_MS);
        }, remaining);
      }
    });
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      if (runningTimerRef.current) clearTimeout(runningTimerRef.current);
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      unsub();
    };
  }, []);

  const shouldShow = (pending ?? 0) > 0 || running || synced || !online;

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

  // Freeze display state while exit animation plays — prevents orange flash during fade-out
  const displayRef = useRef({ synced: false, offline: false, pending: 0, running: false });
  if (visible) displayRef.current = { synced, offline: !online, pending: pending ?? 0, running };
  const d = displayRef.current;

  if (!rendered) return null;

  const canTap = !d.offline && !d.running && !d.synced && d.pending > 0;

  const label = d.offline && d.pending === 0
    ? "Offline"
    : d.offline
      ? `${d.pending} offline`
      : d.running
        ? "Synkronoidaan…"
        : d.synced
          ? "Synkronoitu"
          : `${d.pending} odottaa`;

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
          background: d.offline ? "#1a1a1f" : d.synced ? "#0d1f14" : "#1c1800",
          border: `1px solid ${d.offline ? "rgba(255,255,255,0.1)" : d.synced ? "rgba(34,197,94,0.4)" : "rgba(245,166,35,0.35)"}`,
          boxShadow: d.offline
            ? "0 2px 12px rgba(0,0,0,0.4)"
            : d.synced
              ? "0 2px 12px rgba(34,197,94,0.2)"
              : "0 2px 12px rgba(245,166,35,0.2)",
          fontSize: 12,
          fontWeight: 700,
          color: d.offline ? "rgba(240,238,245,0.5)" : d.synced ? "#22c55e" : "#F5A623",
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
        {d.synced ? (
          <svg aria-hidden width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 4L4 7.5L10 1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              flexShrink: 0,
              background: d.offline ? "#555" : "#F5A623",
              animation: d.running ? "pulse 1.2s ease-in-out infinite" : undefined,
            }}
          />
        )}
        {label}
      </button>
    </>
  );
}
