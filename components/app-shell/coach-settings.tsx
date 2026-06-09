"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, Pencil, ChevronDown, Sparkles, ChevronRight } from "lucide-react";
import { updateCoachName, updateCoachEmail, updateCoachPhone } from "@/app/coach/actions";
import { avatarHex, nameInitials } from "@/lib/utils";
import { PushMessagesToggle } from "@/components/settings/push-toggle";
import { WhatsNewDialog } from "@/components/changelog/whats-new-dialog";
import { useChangelog } from "@/hooks/use-changelog";

type Me = { id: string; full_name: string | null; email?: string | null; phone?: string | null } | null;

// Lightweight collapsible row used to hide the (lazily-loaded) push toggle
// behind a tap. Matches the visual rhythm of the rest of the panel.
function CoachCollapsibleSection({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "hsl(var(--muted-foreground))",
          fontSize: 10,
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
      {open && (
        <div style={{ padding: "0 16px 12px" }}>
          <PushMessagesToggle variant="coach" bare />
        </div>
      )}
    </div>
  );
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
                background: saved ? "color-mix(in srgb, var(--c-success) 15%, transparent)" : "hsl(var(--muted))",
                border: `1px solid ${saved ? "color-mix(in srgb, var(--c-success) 40%, transparent)" : "hsl(var(--border))"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isPending ? 0.5 : 1,
                transition: "background 200ms ease, border-color 200ms ease",
              }}
            >
              <svg key={animKey} width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke={saved ? "var(--c-success)" : "hsl(var(--muted-foreground))"}
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
              <Pencil size={13} />
            </button>
          </>
        )}
      </div>
      {notice && (
        <p style={{ fontSize: 11, color: "var(--c-success)", marginTop: 2 }}>{notice}</p>
      )}
    </div>
  );
}

function CoachSettingsPanel({ me, closing, onAnimationEnd, hasUnread, markRead }: {
  me: Me;
  closing: boolean;
  onAnimationEnd: () => void;
  hasUnread: boolean;
  markRead: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
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

      {/* Uutta Gainlyssä */}
      <div style={{ padding: "8px 12px" }}>
        <button
          type="button"
          onClick={() => { setWhatsNewOpen(true); markRead(); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500,
            cursor: "pointer", border: "1px solid hsl(var(--border))",
            background: "hsl(var(--muted))", color: "hsl(var(--foreground))",
            transition: "background 150ms ease",
          }}
        >
          <Sparkles size={15} color="hsl(var(--primary))" fill={hasUnread ? "hsl(var(--primary))" : "none"} />
          <span style={{ flex: 1, textAlign: "left" }}>Uutta Gainlyssä</span>
          {hasUnread && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              color: "hsl(var(--primary-foreground))", background: "hsl(var(--primary))",
              padding: "1px 7px", borderRadius: 999,
            }}>
              Uutta
            </span>
          )}
          <ChevronRight size={13} color="hsl(var(--muted-foreground))" />
        </button>
      </div>

      {D}

      <CoachCollapsibleSection title="Ilmoitukset" />

      <WhatsNewDialog role="coach" open={whatsNewOpen} onOpenChange={setWhatsNewOpen} />

      {D}

      {/* Theme */}
      <div style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
          Teema
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sun size={14} color={!isDark ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} fill={!isDark ? "hsl(var(--primary))" : "none"} />
          <button
            role="switch"
            aria-checked={isDark}
            aria-label="Tumma teema"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="ios-toggle"
            data-on={isDark ? "1" : "0"}
          >
            <span className="ios-toggle-thumb" />
          </button>
          <Moon size={14} color={isDark ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} fill={isDark ? "hsl(var(--primary))" : "none"} />
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
          <LogOut size={15} />
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
  const { hasUnread, markRead } = useChangelog("coach");

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

  const color = avatarHex(me?.full_name);
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
          {nameInitials(me?.full_name)}
        </div>
        {firstName && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {firstName}
          </span>
        )}
        <ChevronDown
          size={12}
          strokeWidth={2.5}
          color="hsl(var(--muted-foreground))"
          style={{ transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        />
      </button>

      {hasUnread && !open && (
        <span
          aria-hidden
          style={{
            position: "absolute", top: -1, right: -1,
            width: 10, height: 10, borderRadius: "50%",
            background: "hsl(var(--primary))",
            border: "2px solid hsl(var(--background))",
          }}
        />
      )}

      {open && (
        <CoachSettingsPanel me={me} closing={closing} onAnimationEnd={handleAnimEnd} hasUnread={hasUnread} markRead={markRead} />
      )}
    </div>
  );
}
