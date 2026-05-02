"use client";

import { useState } from "react";
import { roundKg } from "@/lib/calc/one-rm";
import { ATTEMPT_MODES, BIG_THREE, calcAttempts } from "@/lib/powerlifting";
import type { AttemptMode, BigThreeKey } from "@/lib/powerlifting";

function formatW(w: number | null) {
  if (w === null) return "—";
  return w % 1 === 0 ? `${w}` : `${w.toFixed(1)}`;
}

export function KilpailutyokaluCard({
  bigThreeE1rm,
}: {
  bigThreeE1rm: Record<BigThreeKey, number | null>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AttemptMode>("normal");

  return (
    <div>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: 0, marginBottom: open ? 10 : 0, fontFamily: "inherit",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--c-text-muted, hsl(var(--muted-foreground)))" }}>
          Kilpailutyökalu
        </div>
        <div style={{ fontSize: 16, color: "var(--c-text-muted, hsl(var(--muted-foreground)))", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▾
        </div>
      </button>

      {/* Animated body */}
      <div style={{
        overflow: "hidden",
        maxHeight: open ? 800 : 0,
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 2 }}>
          {/* Mode selector */}
          <div style={{ background: "var(--c-surface2, hsl(var(--muted)))", borderRadius: 10, padding: 3, display: "flex" }}>
            {(Object.entries(ATTEMPT_MODES) as [AttemptMode, typeof ATTEMPT_MODES[AttemptMode]][]).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                  background: mode === key ? "var(--c-surface, hsl(var(--card)))" : "transparent",
                  fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  color: mode === key ? "var(--c-text, hsl(var(--foreground)))" : "var(--c-text-muted, hsl(var(--muted-foreground)))",
                  boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lifts */}
          {BIG_THREE.map(({ key, label }) => {
            const e1rm = bigThreeE1rm[key];
            const atts = e1rm != null ? calcAttempts(e1rm, ATTEMPT_MODES[mode].pcts) : null;
            return (
              <div key={key} style={{ background: "var(--c-surface, hsl(var(--card)))", border: "1px solid var(--c-border, hsl(var(--border)))", borderRadius: 16, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: atts ? 12 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                  {e1rm != null
                    ? <div style={{ fontSize: 12, color: "var(--c-text-muted, hsl(var(--muted-foreground)))" }}>e1RM {formatW(roundKg(e1rm))} kg</div>
                    : <div style={{ fontSize: 12, color: "var(--c-text-muted, hsl(var(--muted-foreground)))" }}>Ei dataa</div>}
                </div>
                {atts && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {atts.map((kg, i) => (
                      <div key={i} style={{
                        background: i === 2 ? "var(--c-pink-dim, rgba(255,29,140,0.12))" : "var(--c-surface2, hsl(var(--muted)))",
                        border: i === 2 ? "1px solid rgba(255,29,140,0.25)" : "1px solid transparent",
                        borderRadius: 10, padding: "10px 8px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: i === 2 ? "#FF1D8C" : "var(--c-text-muted, hsl(var(--muted-foreground)))", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                          {i + 1}. nosto
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: i === 2 ? "#FF1D8C" : "var(--c-text, hsl(var(--foreground)))" }}>{kg}</div>
                        <div style={{ fontSize: 10, color: "var(--c-text-subtle, hsl(var(--muted-foreground)))" }}>kg</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Competition total */}
          {(() => {
            const thirds = BIG_THREE.map(({ key }) => {
              const e1rm = bigThreeE1rm[key];
              return e1rm != null ? (calcAttempts(e1rm, ATTEMPT_MODES[mode].pcts)[2] ?? null) : null;
            });
            const total = thirds.every(v => v != null) ? thirds.reduce((s, v) => s! + v!, 0) : null;
            return total != null ? (
              <div style={{ background: "var(--c-surface, hsl(var(--card)))", border: "1px solid var(--c-border, hsl(var(--border)))", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Yhteistulos (kilpailu)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#FF1D8C" }}>{total} kg</div>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}
