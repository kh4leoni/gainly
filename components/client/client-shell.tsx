"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect, useTransition } from "react";
import { House, CalendarDots, Trophy, ClockCounterClockwise, ChatCircle, Sun, Moon, SignOut, PencilSimple, CaretDown } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { SyncBar } from "@/components/offline/sync-bar";
import { useWorkoutPrefetch } from "@/hooks/use-workout-prefetch";
import { logBodyweight, logWaist, updateProfileName } from "@/app/client/actions";
import { usePendingNav } from "@/lib/nav-context";
import { RouteSkeleton } from "@/components/client/route-skeleton";
import type { ReactNode } from "react";

const NAV = [
  { href: "/client/dashboard", label: "Koti",       Icon: House },
  { href: "/client/ohjelma",   label: "Ohjelma",    Icon: CalendarDots },
  { href: "/client/progress",  label: "Ennätykset", Icon: Trophy },
  { href: "/client/history",   label: "Historia",   Icon: ClockCounterClockwise },
  { href: "/client/messages",  label: "Viestit",    Icon: ChatCircle },
] as const;

type Me = { id: string; full_name: string | null } | null;
type MeasurementEntry = { value: number; logged_at: string };

function initials(name: string | null) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return `${p[0]?.[0] ?? ""}${p[1]?.[0] ?? ""}`.toUpperCase();
}

function avatarColor(seed: string) {
  const palette = ["#ec4899","#f97316","#8b5cf6","#14b8a6","#6366f1","#f43f5e"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length] ?? "#ec4899";
}

const NAV_PATHS = NAV.map((n) => n.href);
function navIndex(path: string) {
  return NAV_PATHS.findIndex((p) => path.startsWith(p));
}

function CollapsibleSection({ title, open, onToggle, children }: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--c-text-muted)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>{title}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 240ms ease", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className={`settings-section-body${open ? " open" : ""}`}>
        <div className="settings-section-inner">
          <div style={{ padding: "0 16px 14px" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function OmatTiedotSection({ me }: { me: Me }) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(me?.full_name ?? "");
  const [displayName, setDisplayName] = useState(me?.full_name ?? "");
  const [saved, setSaved] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const color = avatarColor(displayName || "?");

  function save() {
    const trimmed = nameVal.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    setSaved(true);
    setAnimKey(k => k + 1);
    setEditing(false);
    const btn = btnRef.current;
    if (btn) {
      btn.classList.remove("bw-save-pop");
      void btn.offsetWidth;
      btn.classList.add("bw-save-pop");
    }
    startTransition(async () => {
      try { await updateProfileName(trimmed); } catch {}
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", background: color, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: "#fff", boxShadow: `0 0 10px ${color}55`,
      }}>
        {initials(displayName || null)}
      </div>

      {editing ? (
        <>
          <input
            autoFocus
            type="text"
            value={nameVal}
            onChange={(e) => { setNameVal(e.target.value); if (saved) setSaved(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setNameVal(displayName); } }}
            style={{
              flex: 1, minWidth: 0, maxWidth: 148, padding: "5px 8px", borderRadius: 8,
              border: "1px solid var(--c-border)", background: "var(--c-surface2)",
              color: "var(--c-text)", fontSize: 13, fontWeight: 600, outline: "none",
            }}
          />
          <button
            ref={btnRef}
            type="button"
            onClick={save}
            disabled={isPending}
            title="Tallenna"
            className="bw-save-btn"
            style={{
              width: 30, height: 30, borderRadius: "50%", padding: 0, flexShrink: 0,
              background: saved ? "rgba(62,207,142,0.15)" : "var(--c-surface2)",
              border: `1px solid ${saved ? "rgba(62,207,142,0.4)" : "var(--c-border)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              opacity: isPending ? 0.5 : 1,
              transition: "background 200ms ease, border-color 200ms ease",
            }}
          >
            <svg key={animKey} width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke={saved ? "#3ECF8E" : "var(--c-text-subtle)"}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline className={animKey > 0 ? "check-draw" : ""} points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </>
      ) : (
        <>
          <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName || "—"}
          </p>
          <button
            type="button"
            onClick={() => { setEditing(true); setSaved(false); }}
            style={{
              width: 28, height: 28, borderRadius: "50%", padding: 0, flexShrink: 0,
              background: "var(--c-surface2)", border: "1px solid var(--c-border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--c-text-muted)", transition: "background 150ms ease",
            }}
            title="Muokkaa nimeä"
          >
            <PencilSimple size={13} />
          </button>
        </>
      )}
    </div>
  );
}

function MeasurementSection({ label, unit, max, initialHistory, onSave }: {
  label: string;
  unit: string;
  max: number;
  initialHistory: MeasurementEntry[];
  onSave: (value: number) => Promise<void>;
}) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<MeasurementEntry[]>(initialHistory);
  const [isPending, startTransition] = useTransition();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleChange(v: string) {
    setInputVal(v);
    if (saved) setSaved(false);
  }

  function save() {
    const n = parseFloat(inputVal.replace(",", "."));
    if (isNaN(n) || n <= 0 || n >= max) return;
    setHistory(prev => [{ value: n, logged_at: new Date().toISOString() }, ...prev]);
    setSaved(true);
    setAnimKey(k => k + 1);
    const btn = btnRef.current;
    if (btn) {
      btn.classList.remove("bw-save-pop");
      void btn.offsetWidth;
      btn.classList.add("bw-save-pop");
    }
    startTransition(async () => {
      try { await onSave(n); } catch {}
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--c-text-muted)", fontWeight: 500, flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1 }} />
        <input
          type="number"
          inputMode="decimal"
          value={inputVal}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="0.0"
          step="0.1"
          style={{
            width: 68,
            padding: "5px 8px",
            borderRadius: 8,
            border: "1px solid var(--c-border)",
            background: "var(--c-surface2)",
            color: "var(--c-text)",
            fontSize: 13,
            fontWeight: 600,
            outline: "none",
            textAlign: "right",
          }}
        />
        <span style={{ fontSize: 12, color: "var(--c-text-muted)", flexShrink: 0, width: 20 }}>{unit}</span>
        <button
          ref={btnRef}
          type="button"
          onClick={save}
          disabled={isPending}
          title="Tallenna"
          className="bw-save-btn"
          style={{
            width: 30, height: 30, borderRadius: "50%", padding: 0, flexShrink: 0,
            background: saved ? "rgba(62,207,142,0.15)" : "var(--c-surface2)",
            border: `1px solid ${saved ? "rgba(62,207,142,0.4)" : "var(--c-border)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: isPending ? 0.5 : 1,
            transition: "background 200ms ease, border-color 200ms ease",
          }}
        >
          <svg key={animKey} width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke={saved ? "#3ECF8E" : "var(--c-text-subtle)"}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline className={animKey > 0 ? "check-draw" : ""} points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>

      {history.length > 0 && (
        <>
          <div style={{ height: 10 }} />
          <div style={{ height: 1, background: "var(--c-border)", margin: "0 -16px" }} />
          <button
            type="button"
            onClick={() => setHistoryOpen(v => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 0 0", background: "none", border: "none", cursor: "pointer",
              color: "var(--c-text-muted)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            <span>Historia</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {historyOpen && (
            <div style={{ marginTop: 6, maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
              {history.map((entry, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "5px 8px", borderRadius: 7,
                  background: i === 0 ? "var(--c-surface2)" : "none",
                }}>
                  <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
                    {new Date(entry.logged_at).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? "var(--c-text)" : "var(--c-text-muted)" }}>
                    {entry.value} {unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Coach = { name: string | null; email: string | null; phone: string | null } | null;

function SettingsPanel({ me, coach, bwHistory, waistHistory, closing, onAnimationEnd }: {
  me: Me;
  coach?: Coach;
  bwHistory: MeasurementEntry[];
  waistHistory: MeasurementEntry[];
  closing: boolean;
  onAnimationEnd: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [omatOpen, setOmatOpen] = useState(true);
  const [mittauksetOpen, setMittauksetOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";
  const D = <div style={{ height: 1, background: "var(--c-border)" }} />;

  return (
    <div
      onAnimationEnd={onAnimationEnd}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 12,
        width: 272,
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        zIndex: 50,
        animation: closing ? "c-fadeDown 0.15s ease-in both" : "c-fadeUp 0.18s ease-out both",
        maxHeight: "80vh",
        overflowY: "auto",
        overflowX: "visible",
      }}
    >
      {/* Omat tiedot */}
      <CollapsibleSection title="Omat tiedot" open={omatOpen} onToggle={() => setOmatOpen(v => !v)}>
        <OmatTiedotSection me={me} />
      </CollapsibleSection>

      {D}

      {/* Mittaukset */}
      <CollapsibleSection title="Mittaukset" open={mittauksetOpen} onToggle={() => setMittauksetOpen(v => !v)}>
        <MeasurementSection label="Paino" unit="kg" max={500} initialHistory={bwHistory} onSave={logBodyweight} />
        <div style={{ height: 12 }} />
        <div style={{ height: 1, background: "var(--c-border)", margin: "0 -16px" }} />
        <div style={{ height: 12 }} />
        <MeasurementSection label="Vyötärö" unit="cm" max={300} initialHistory={waistHistory} onSave={logWaist} />
      </CollapsibleSection>

      {D}

      {/* Coach info */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-subtle)" }}>
          Valmentajan tiedot
        </p>
        {coach ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{coach.name ?? "—"}</p>
            {coach.email && (
              <p style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{coach.email}</p>
            )}
            {coach.phone && (
              <p style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{coach.phone}</p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--c-text-muted)" }}>—</p>
        )}
      </div>

      {D}

      {/* Theme */}
      <div style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-subtle)" }}>
          Teema
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sun size={14} color={!isDark ? "var(--c-pink)" : "var(--c-text-subtle)"} weight={!isDark ? "fill" : "regular"} />
          <button
            role="switch"
            aria-checked={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            style={{
              width: 42, height: 24, borderRadius: 12, border: "none",
              background: isDark ? "var(--c-pink)" : "var(--c-surface3)",
              cursor: "pointer", position: "relative", flexShrink: 0,
              transition: "background 220ms ease",
              padding: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3,
              left: isDark ? 21 : 3,
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              transition: "left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: "block",
            }} />
          </button>
          <Moon size={14} color={isDark ? "var(--c-pink)" : "var(--c-text-subtle)"} weight={isDark ? "fill" : "regular"} />
        </div>
      </div>

      {D}

      {/* Logout */}
      <form action="/auth/logout" method="post" style={{ padding: "10px 12px 12px" }}>
        <button
          type="submit"
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500,
            cursor: "pointer", border: "1px solid var(--c-border)",
            background: "var(--c-surface2)", color: "var(--c-text-muted)",
          }}
        >
          <SignOut size={15} />
          Kirjaudu ulos
        </button>
      </form>
    </div>
  );
}

export function ClientShell({
  me,
  coach,
  bwHistory = [],
  waistHistory = [],
  children,
}: {
  me: Me;
  coach?: Coach;
  bwHistory?: MeasurementEntry[];
  waistHistory?: MeasurementEntry[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { pendingHref, setPendingHref } = usePendingNav();

  // animKey: changes immediately on click (pendingHref), stays fixed when content arrives
  // so animation fires at click time and doesn't double-fire when RSC response lands
  const animKeyRef = useRef(pathname);
  const animKey = pendingHref ?? animKeyRef.current;
  if (pendingHref) animKeyRef.current = pendingHref;

  const dirRef = useRef(typeof window !== "undefined" && window.location.pathname.startsWith("/client/messages") ? "c-msg-in" : "c-ani");
  const dirPrevRef = useRef(pathname);

  if (dirPrevRef.current !== animKey) {
    const prev = dirPrevRef.current;
    const prevIdx = navIndex(prev);
    const currIdx = navIndex(animKey);
    dirRef.current = prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx
      ? currIdx > prevIdx ? "c-slide-right" : "c-slide-left"
      : "c-ani";
    dirPrevRef.current = animKey;
  }

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  function openSettings() { setSettingsOpen(true); setSettingsClosing(false); }
  function closeSettings() { setSettingsClosing(true); }
  function handlePanelAnimationEnd() { if (settingsClosing) { setSettingsOpen(false); setSettingsClosing(false); } }
  function toggleSettings() { settingsOpen && !settingsClosing ? closeSettings() : openSettings(); }

  useEffect(() => {
    if (!settingsOpen || settingsClosing) return;
    function handle(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        closeSettings();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [settingsOpen, settingsClosing]);

  const dir = dirRef.current;
  const isMessages = pathname.startsWith("/client/messages");

  useWorkoutPrefetch(me?.id ?? "");

  const color = avatarColor(me?.full_name ?? "?");

  return (
    <div
      className="client-app"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "var(--c-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Status bar spacer ── */}
        <div style={{ height: "env(safe-area-inset-top, 0px)", background: "var(--c-surface)", flexShrink: 0 }} />

        {/* ── Top header ── */}
        <header
          style={{
            height: 64,
            paddingLeft: "20px",
            paddingRight: "20px",
            borderBottom: "1px solid var(--c-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            background: "var(--c-surface)",
            position: "relative",
          }}
          ref={settingsRef}
        >
          <div style={{ lineHeight: 1 }}>
            <Image src="/fs%20collab.png" alt="fs collab" width={140} height={44} className="logo-adaptive" style={{ objectFit: "contain" }} />
          </div>

          {/* Pill button — opens settings */}
          <button
            type="button"
            onClick={toggleSettings}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 9px 4px 4px",
              borderRadius: 999,
              border: `1px solid ${settingsOpen ? "var(--c-pink)" : "var(--c-border)"}`,
              background: settingsOpen ? "var(--c-pink-dim)" : "var(--c-surface2)",
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
              flexShrink: 0,
            }}
            title="Asetukset"
            aria-expanded={settingsOpen}
          >
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {initials(me?.full_name ?? null)}
            </div>
            <span style={{ fontSize: 12, color: "var(--c-text)", fontWeight: 600, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {me?.full_name?.split(" ")[0] ?? ""}
            </span>
            <CaretDown
              size={11}
              weight="bold"
              color="var(--c-text-muted)"
              style={{ transition: "transform 200ms ease", transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
            />
          </button>

          {settingsOpen && (
            <SettingsPanel
              me={me}
              coach={coach}
              bwHistory={bwHistory}
              waistHistory={waistHistory}
              closing={settingsClosing}
              onAnimationEnd={handlePanelAnimationEnd}
            />
          )}

          <SyncBar />
        </header>

        {/* ── Content ── */}
        <main style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          {/* Outer: slide animation fires immediately on click */}
          <div
            key={animKey}
            className={dir}
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--c-bg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {pendingHref ? (
              /* Skeleton shown while RSC is in-flight */
              <RouteSkeleton href={pendingHref} />
            ) : (
              /* Real content fades in when RSC arrives */
              <div
                key={pathname}
                className="c-fade"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflowY: isMessages ? "hidden" : "auto",
                  overflowX: "hidden",
                  overscrollBehavior: "contain",
                }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: isMessages ? undefined : "100%" }}>
                  {children}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Bottom nav ── */}
        <nav
          style={{
            display: "flex",
            borderTop: "1px solid var(--c-border)",
            background: "var(--c-surface)",
            flexShrink: 0,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {NAV.map(({ href, label, Icon }) => {
            const checkHref = pendingHref ?? pathname;
            const active = checkHref.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setPendingHref(href)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 0 8px",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "30%",
                      width: "40%",
                      height: 2,
                      background: "var(--c-pink)",
                      borderRadius: "0 0 2px 2px",
                      boxShadow: "0 0 8px var(--c-pink-glow)",
                    }}
                  />
                )}
                <Icon
                  size={24}
                  weight={active ? "fill" : "regular"}
                  color={active ? "var(--c-pink)" : "var(--c-text-muted)"}
                />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: "0.2px", color: active ? "var(--c-pink)" : "var(--c-text-subtle)" }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
