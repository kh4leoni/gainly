"use client";

import { useRef, useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type MeasurementEntry = { id?: string; value: number; logged_at: string };

export function MeasurementSection({
  label,
  unit,
  max,
  initialHistory,
  onSave,
  onDelete,
}: {
  label: string;
  unit: string;
  max: number;
  initialHistory: MeasurementEntry[];
  onSave: (value: number) => Promise<{ id: string; logged_at: string }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<MeasurementEntry[]>(initialHistory);
  const [isPending, startTransition] = useTransition();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<MeasurementEntry | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function requestDelete(entry: MeasurementEntry) {
    if (!entry.id) return;
    setPendingDelete(entry);
  }

  function confirmDelete() {
    const entry = pendingDelete;
    if (!entry?.id) return;
    setHistory((prev) => prev.filter((e) => e.id !== entry.id));
    startTransition(async () => {
      try {
        await onDelete(entry.id!);
      } catch {}
    });
  }

  function handleChange(v: string) {
    setInputVal(v);
    if (saved) setSaved(false);
  }

  function save() {
    const n = parseFloat(inputVal.replace(",", "."));
    if (isNaN(n) || n <= 0 || n >= max) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: MeasurementEntry = { id: tempId, value: n, logged_at: new Date().toISOString() };
    setHistory((prev) => [optimistic, ...prev]);
    setHistoryOpen(true);
    setSaved(true);
    setAnimKey((k) => k + 1);
    const btn = btnRef.current;
    if (btn) {
      btn.classList.remove("bw-save-pop");
      void btn.offsetWidth;
      btn.classList.add("bw-save-pop");
    }
    startTransition(async () => {
      try {
        const saved = await onSave(n);
        setHistory((prev) =>
          prev.map((e) => (e.id === tempId ? { id: saved.id, value: n, logged_at: saved.logged_at } : e))
        );
      } catch {
        // Roll the optimistic row back if the server rejected the insert.
        setHistory((prev) => prev.filter((e) => e.id !== tempId));
      }
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
            borderRadius: "var(--r-sm)",
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
            width: 30,
            height: 30,
            borderRadius: "50%",
            padding: 0,
            flexShrink: 0,
            background: saved ? "color-mix(in srgb, var(--c-success) 15%, transparent)" : "var(--c-surface2)",
            border: `1px solid ${saved ? "color-mix(in srgb, var(--c-success) 40%, transparent)" : "var(--c-border)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isPending ? 0.5 : 1,
            transition: "background 200ms ease, border-color 200ms ease",
          }}
        >
          <svg
            key={animKey}
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke={saved ? "var(--c-success)" : "var(--c-text-subtle)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline className={animKey > 0 ? "check-draw" : ""} points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {history.length > 0 && (
        <>
          <div style={{ height: 10 }} />
          <div style={{ height: 1, background: "var(--c-border)", margin: "0 -16px" }} />
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 0 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--c-text-muted)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Historia</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {historyOpen && (
            <div
              style={{
                marginTop: 6,
                maxHeight: 160,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {history.map((entry, i) => (
                <div
                  key={entry.id ?? i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "5px 8px",
                    borderRadius: "var(--r-sm)",
                    background: i === 0 ? "var(--c-surface2)" : "none",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
                    {new Date(entry.logged_at).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: i === 0 ? "var(--c-text)" : "var(--c-text-muted)",
                      }}
                    >
                      {entry.value} {unit}
                    </span>
                    {entry.id && !entry.id.startsWith("temp-") && (
                      <button
                        type="button"
                        onClick={() => requestDelete(entry)}
                        aria-label="Poista mittaus"
                        title="Poista"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          padding: 0,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--c-text-subtle)",
                          borderRadius: "var(--r-sm)",
                          transition: "color 150ms ease, background 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--c-danger, #ef4444)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--c-danger, #ef4444) 10%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--c-text-subtle)";
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        <Trash size={13} weight="regular" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Poistetaanko mittaus?"
        description={
          pendingDelete
            ? `${new Date(pendingDelete.logged_at).toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" })} – ${pendingDelete.value} ${unit}`
            : ""
        }
        confirmLabel="Poista"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
