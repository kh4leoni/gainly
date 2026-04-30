"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, SignOut, PencilSimple, CaretDown } from "@phosphor-icons/react";
import { updateCoachName, updateCoachEmail, updateCoachPhone } from "@/app/coach/actions";

type Me = { id: string; full_name: string | null; email?: string | null; phone?: string | null } | null;

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

const fieldInputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))",
  color: "hsl(var(--foreground))", fontSize: 13, fontWeight: 500,
  outline: "none", boxSizing: "border-box",
};

function EditableField({
  label,
  initialValue,
  type = "text",
  onSave,
  hint,
}: {
  label: string;
  initialValue: string;
  type?: "text" | "email" | "tel";
  onSave: (val: string) => Promise<void>;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(initialValue);
  const [displayVal, setDisplayVal] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [animKey, setAnimKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);

  function save() {
    const trimmed = inputVal.trim();
    startTransition(async () => {
      try {
        await onSave(trimmed);
        setDisplayVal(trimmed);
        setSaved(true);
        setAnimKey(k => k + 1);
        setEditing(false);
        if (hint) setNotice(hint);
        const btn = btnRef.current;
        if (btn) {
          btn.classList.remove("bw-save-pop");
          void btn.offsetWidth;
          btn.classList.add("bw-save-pop");
        }
      } catch {}
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {editing ? (
          <>
            <input
              autoFocus
              type={type}
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); if (saved) setSaved(false); setNotice(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setInputVal(displayVal); } }}
              style={{ ...fieldInputStyle, flex: 1 }}
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
                background: saved ? "rgba(62,207,142,0.15)" : "hsl(var(--muted))",
                border: `1px solid ${saved ? "rgba(62,207,142,0.4)" : "hsl(var(--border))"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isPending ? 0.5 : 1,
                transition: "background 200ms ease, border-color 200ms ease",
              }}
            >
              <svg key={animKey} width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke={saved ? "#3ECF8E" : "hsl(var(--muted-foreground))"}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline className={animKey > 0 ? "check-draw" : ""} points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </>
        ) : (
          <>
            <div style={{
              ...fieldInputStyle, flex: 1,
              color: displayVal ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default",
            }}>
              {displayVal || "—"}
            </div>
            <button
              type="button"
              onClick={() => { setEditing(true); setSaved(false); setNotice(""); }}
              style={{
                width: 30, height: 30, borderRadius: "50%", padding: 0, flexShrink: 0,
                background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "hsl(var(--muted-foreground))",
              }}
              title={`Muokkaa: ${label}`}
            >
              <PencilSimple size={13} />
            </button>
          </>
        )}
      </div>
      {notice && (
        <p style={{ fontSize: 11, color: "#3ECF8E", marginTop: 2 }}>{notice}</p>
      )}
    </div>
  );
}

function CoachSettingsPanel({ me, closing, onAnimationEnd }: {
  me: Me;
  closing: boolean;
  onAnimationEnd: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";
  const D = <div style={{ height: 1, background: "hsl(var(--border))" }} />;

  return (
    <div
      onAnimationEnd={onAnimationEnd}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 280,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        zIndex: 50,
        animation: closing ? "c-fadeDown 0.15s ease-in both" : "c-fadeUp 0.18s ease-out both",
        overflowY: "auto",
        overflowX: "visible",
      }}
    >
      {/* Omat tiedot */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", margin: 0 }}>
          Omat tiedot
        </p>
        <EditableField
          label="Nimi"
          initialValue={me?.full_name ?? ""}
          onSave={updateCoachName}
        />
        <EditableField
          label="S-posti"
          initialValue={me?.email ?? ""}
          type="email"
          onSave={updateCoachEmail}
        />
        <EditableField
          label="Puh"
          initialValue={me?.phone ?? ""}
          type="tel"
          onSave={updateCoachPhone}
        />
      </div>

      {D}

      {/* Theme */}
      <div style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
          Teema
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sun size={14} color={!isDark ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} weight={!isDark ? "fill" : "regular"} />
          <button
            role="switch"
            aria-checked={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            style={{
              width: 42, height: 24, borderRadius: 12, border: "none",
              background: isDark ? "hsl(var(--primary))" : "hsl(var(--muted))",
              cursor: "pointer", position: "relative", flexShrink: 0,
              transition: "background 220ms ease", padding: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3,
              left: isDark ? 21 : 3,
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              transition: "left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)", display: "block",
            }} />
          </button>
          <Moon size={14} color={isDark ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} weight={isDark ? "fill" : "regular"} />
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
            cursor: "pointer", border: "1px solid hsl(var(--border))",
            background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))",
          }}
        >
          <SignOut size={15} />
          Kirjaudu ulos
        </button>
      </form>
    </div>
  );
}

export function CoachSettingsButton({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  function openPanel() { setOpen(true); setClosing(false); }
  function closePanel() { setClosing(true); }
  function handleAnimEnd() { if (closing) { setOpen(false); setClosing(false); } }
  function toggle() { open && !closing ? closePanel() : openPanel(); }

  useEffect(() => {
    if (!open || closing) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closePanel();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, closing]);

  const color = avatarColor(me?.full_name ?? "?");
  const firstName = me?.full_name?.split(" ")[0] ?? "";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "4px 10px 4px 4px",
          borderRadius: 999,
          border: `1px solid ${open ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
          background: open ? "hsl(var(--accent))" : "hsl(var(--muted))",
          cursor: "pointer",
          transition: "background 150ms ease, border-color 150ms ease",
        }}
        title="Asetukset"
        aria-label="Asetukset"
        aria-expanded={open}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          {initials(me?.full_name ?? null)}
        </div>
        {firstName && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {firstName}
          </span>
        )}
        <CaretDown
          size={12}
          weight="bold"
          color="hsl(var(--muted-foreground))"
          style={{ transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        />
      </button>

      {open && (
        <CoachSettingsPanel me={me} closing={closing} onAnimationEnd={handleAnimEnd} />
      )}
    </div>
  );
}
