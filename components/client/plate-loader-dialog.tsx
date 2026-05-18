"use client";

import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDragToDismiss } from "@/hooks/use-drag-to-dismiss";

// Standard plate denominations available in most gyms (kg).
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5] as const;
type PlateKg = (typeof PLATES_KG)[number];

const BAR_OPTIONS = [
  { kg: 20, label: "20 kg (vakio)" },
  { kg: 15, label: "15 kg" },
  { kg: 10, label: "10 kg" },
  { kg: 7, label: "7 kg" },
  { kg: 0, label: "Ei tankoa" },
] as const;

// Color per plate, matching common gym color codes.
const PLATE_COLOR: Record<PlateKg, string> = {
  25: "#E53935",     // red
  20: "#1E88E5",     // blue
  15: "#FDD835",     // yellow
  10: "#43A047",     // green
  5: "#FFFFFF",      // white
  2.5: "#BDBDBD",    // light grey
  1.25: "#616161",   // dark grey
  0.5: "#9E9E9E",    // grey
};

function plateBreakdown(
  perSide: number,
  available: readonly PlateKg[] = PLATES_KG
): { plates: PlateKg[]; remainder: number } {
  const plates: PlateKg[] = [];
  let remaining = perSide;
  // Tolerate float math by rounding to nearest 0.001.
  const round = (n: number) => Math.round(n * 1000) / 1000;
  remaining = round(remaining);
  for (const p of available) {
    while (round(remaining - p) >= 0) {
      plates.push(p);
      remaining = round(remaining - p);
    }
  }
  return { plates, remainder: remaining };
}

function plateHeight(kg: PlateKg): number {
  if (kg >= 20) return 130;
  if (kg >= 15) return 110;
  if (kg >= 10) return 92;
  if (kg >= 5) return 70;
  if (kg >= 2.5) return 48;
  if (kg >= 1.25) return 34;
  return 26;
}
function plateWidth(kg: PlateKg): number {
  if (kg >= 20) return 18;
  if (kg >= 15) return 17;
  if (kg >= 10) return 16;
  if (kg >= 5) return 13;
  if (kg >= 2.5) return 11;
  return 9;
}

export function PlateLoaderDialog({
  trigger,
  exerciseName,
  nextSetNumber,
  nextSetWeight,
}: {
  trigger: React.ReactNode;
  exerciseName: string;
  nextSetNumber: number | null;
  nextSetWeight: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [barKg, setBarKg] = useState<number>(20);
  const [maxPlateKg, setMaxPlateKg] = useState<25 | 20>(25);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useDragToDismiss({
    handleRef,
    contentRef,
    onDismiss: () => setOpen(false),
    enabled: open,
  });

  const total = nextSetWeight ?? 0;
  const perSide = Math.max(0, (total - barKg) / 2);
  const availablePlates = useMemo(
    () => PLATES_KG.filter((p) => p <= maxPlateKg),
    [maxPlateKg]
  );
  const { plates, remainder } = useMemo(
    () => plateBreakdown(perSide, availablePlates),
    [perSide, availablePlates]
  );
  const fits = remainder === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        ref={contentRef}
        className="client-themed max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
        } as React.CSSProperties}
      >
        <div ref={handleRef} className="ios-drag-handle" aria-hidden>
          <div className="ios-drag-handle-bar" />
        </div>
        <DialogHeader style={{ flexShrink: 0 }}>
          <DialogTitle style={{ color: "var(--c-text)" }}>Levyt — {exerciseName}</DialogTitle>
        </DialogHeader>

        <div style={{ overflowY: "auto", flex: 1, padding: "4px 2px 2px" }}>
          {/* Top: set + target weight */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {nextSetNumber != null ? `Sarja ${nextSetNumber}` : "Seuraava sarja"}
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--c-text)" }}>
              {nextSetWeight != null ? `${nextSetWeight} kg` : "—"}
            </span>
          </div>

          {/* Bar selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-subtle)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
              Tanko
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BAR_OPTIONS.map((b) => (
                <button
                  key={b.kg}
                  type="button"
                  onClick={() => setBarKg(b.kg)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: "var(--r-xl)",
                    border: `1px solid ${barKg === b.kg ? "var(--c-pink)" : "var(--c-border)"}`,
                    background: barKg === b.kg ? "var(--c-pink-dim)" : "var(--c-surface2)",
                    color: barKg === b.kg ? "var(--c-pink)" : "var(--c-text-muted)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max plate selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-subtle)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
              Suurin levy
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {([25, 20] as const).map((kg) => (
                <button
                  key={kg}
                  type="button"
                  onClick={() => setMaxPlateKg(kg)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--r-xl)",
                    border: `1px solid ${maxPlateKg === kg ? "var(--c-pink)" : "var(--c-border)"}`,
                    background: maxPlateKg === kg ? "var(--c-pink-dim)" : "var(--c-surface2)",
                    color: maxPlateKg === kg ? "var(--c-pink)" : "var(--c-text-muted)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {kg} kg
                </button>
              ))}
            </div>
          </div>

          {nextSetWeight == null ? (
            <div style={{
              padding: "20px 14px", textAlign: "center",
              border: "1px dashed var(--c-border)", borderRadius: "var(--r-md)",
              color: "var(--c-text-muted)", fontSize: 13,
            }}>
              Aseta painon tavoite sarjalle ensin.
            </div>
          ) : total < barKg ? (
            <div style={{
              padding: "14px", borderRadius: "var(--r-md)",
              border: "1px solid color-mix(in srgb, var(--c-warning) 30%, transparent)", background: "color-mix(in srgb, var(--c-warning) 8%, transparent)",
              color: "var(--c-warning)", fontSize: 13,
            }}>
              {total} kg on alle tangon painon ({barKg} kg). Käytä kevyempää tankoa tai vapaapainoja.
            </div>
          ) : (
            <>
              {/* Plate visual — plates only */}
              <div style={{
                background: "var(--c-surface2)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-md)", padding: "18px 14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 2, minHeight: 160, overflowX: "auto",
              }}>
                {/* Plates, largest first */}
                {plates.map((p, i) => (
                  <div key={i} style={{
                    width: plateWidth(p), height: plateHeight(p),
                    background: PLATE_COLOR[p],
                    borderRadius: "var(--r-xs)",
                    border: "1px solid rgba(0,0,0,0.25)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
                    flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 800,
                    color: p === 5 || p === 15 ? "#000" : "#fff",
                  }}>
                    {p}
                  </div>
                ))}
                {plates.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginLeft: 12 }}>
                    Pelkkä tanko
                  </div>
                )}
              </div>

              {/* Plate count list */}
              {plates.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {Array.from(new Set(plates)).map((p) => {
                    const count = plates.filter((x) => x === p).length;
                    return (
                      <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <span style={{
                          width: 12, height: 12, borderRadius: "var(--r-xs)",
                          background: PLATE_COLOR[p as PlateKg],
                          border: "1px solid rgba(0,0,0,0.3)", flexShrink: 0,
                        }} />
                        <span style={{ fontWeight: 600, color: "var(--c-text)" }}>
                          {count} × {p} kg
                        </span>
                        <span style={{ color: "var(--c-text-muted)", fontSize: 12 }}>
                          / puoli
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {!fits && (
                <div style={{
                  marginTop: 12, padding: "10px 12px", borderRadius: "var(--r-md)",
                  border: "1px solid color-mix(in srgb, var(--c-warning) 30%, transparent)", background: "color-mix(in srgb, var(--c-warning) 8%, transparent)",
                  color: "var(--c-warning)", fontSize: 12,
                }}>
                  {remainder} kg/puoli ei saatu kasaan tavanomaisilla levyillä.
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
