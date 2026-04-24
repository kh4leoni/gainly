"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getRecentPRs } from "@/lib/queries/workouts";
import { derivedRepMax, roundKg } from "@/lib/calc/one-rm";

type Exercise = { id: string; name: string };
type PR = {
  id: string;
  rep_range: string;
  weight: number | null;
  reps: number | null;
  estimated_1rm: number | null;
  achieved_at: string;
  exercises: { id: string; name: string } | null;
};

function formatW(w: number | null) {
  if (w === null) return "—";
  return w % 1 === 0 ? `${w}` : `${w.toFixed(1)}`;
}

export function ProgressView({ clientId, exercises }: { clientId: string; exercises: Exercise[] }) {
  const supabase = createClient();
  const [selId, setSelId] = useState(exercises[0]?.id ?? "");
  const [rep, setRep] = useState(1);

  const prs = useQuery({
    queryKey: ["prs", clientId, "all"],
    queryFn: () => getRecentPRs(supabase, clientId, 50),
    staleTime: 60_000,
  }) as { data: PR[] | undefined };

  const selExName = exercises.find((e) => e.id === selId)?.name ?? "";

  // Single "1RM" row per (client, exercise). All 1..5RM values are derived from it.
  const oneRMByExercise = new Map<string, PR>();
  for (const pr of prs.data ?? []) {
    if (!pr.exercises?.id) continue;
    if (pr.rep_range !== "1RM") continue;
    if (!oneRMByExercise.has(pr.exercises.id)) oneRMByExercise.set(pr.exercises.id, pr);
  }

  const matchedPR = selId ? oneRMByExercise.get(selId) ?? null : null;
  const derived =
    matchedPR && matchedPR.estimated_1rm != null
      ? derivedRepMax(matchedPR.estimated_1rm, rep)
      : null;

  const allBests = Array.from(oneRMByExercise.values());

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>Ennätykset</div>
      <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 22 }}>Valitse harjoitus ja toistomäärä</div>

      {/* Exercise selector */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <select
          value={selId}
          onChange={(e) => setSelId(e.target.value)}
          style={{
            width: "100%",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 14,
            padding: "13px 40px 13px 16px",
            color: selId ? "var(--c-text)" : "var(--c-text-muted)",
            fontSize: 14,
            fontWeight: 500,
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s",
            cursor: "pointer",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--c-pink)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--c-border)")}
        >
          <option value="">Valitse harjoitus...</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--c-text-muted)" }}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
        </span>
      </div>

      {/* Rep picker */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 12, fontWeight: 500 }}>Toistomäärä</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRep(r)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: `1px solid ${rep === r ? "var(--c-pink)" : "var(--c-border)"}`,
                background: rep === r ? "var(--c-pink-dim)" : "var(--c-surface2)",
                color: rep === r ? "var(--c-pink)" : "var(--c-text-muted)",
                fontWeight: rep === r ? 700 : 400,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
                boxShadow: rep === r ? "0 0 12px var(--c-pink-glow)" : "none",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* PR display (derived N-RM + stored 1RM) */}
      {selId && (
        matchedPR && derived != null && matchedPR.estimated_1rm != null ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div style={{
              background: "var(--c-pink-dim)",
              border: "1px solid rgba(255,29,140,0.35)",
              borderRadius: 18,
              padding: "24px 16px",
              textAlign: "center",
              boxShadow: "0 0 32px rgba(255,29,140,0.12)",
            }}>
              <div style={{ fontSize: 10, color: "var(--c-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                Arvioitu {rep}RM
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: "var(--c-pink)", letterSpacing: "-2px", lineHeight: 1, textShadow: "0 0 30px rgba(255,29,140,0.6)" }}>
                {formatW(roundKg(derived))}
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,29,140,0.7)", marginTop: 4, fontWeight: 600 }}>kg</div>
            </div>
            <div style={{
              background: "rgba(155,77,202,0.10)",
              border: "1px solid rgba(155,77,202,0.30)",
              borderRadius: 18,
              padding: "24px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#9B4DCA", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                Arvioitu 1RM
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#9B4DCA", letterSpacing: "-2px", lineHeight: 1, textShadow: "0 0 30px rgba(155,77,202,0.5)" }}>
                {formatW(roundKg(matchedPR.estimated_1rm))}
              </div>
              <div style={{ fontSize: 14, color: "rgba(155,77,202,0.7)", marginTop: 4, fontWeight: 600 }}>kg</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--c-text-muted)", fontSize: 14, marginBottom: 16 }}>
            Ei ennätystä {selExName || "tälle liikkeelle"}
          </div>
        )
      )}

      {/* All-time bests list */}
      <div style={{ fontSize: 12, color: "var(--c-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
        Kaikki ennätykset (1RM)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {allBests.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--c-text-muted)", fontSize: 13 }}>
            Ei ennätyksiä vielä.
          </div>
        )}
        {allBests.map((pr) => (
          <button
            key={pr.id}
            onClick={() => setSelId(pr.exercises?.id ?? "")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: selId === pr.exercises?.id ? "var(--c-pink-dim)" : "var(--c-surface)",
              border: `1px solid ${selId === pr.exercises?.id ? "rgba(255,29,140,0.3)" : "var(--c-border)"}`,
              borderRadius: 14,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "inherit",
              color: "var(--c-text)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (selId !== pr.exercises?.id) {
                e.currentTarget.style.borderColor = "var(--c-border-hover)";
                e.currentTarget.style.background = "var(--c-surface2)";
              }
            }}
            onMouseLeave={(e) => {
              if (selId !== pr.exercises?.id) {
                e.currentTarget.style.borderColor = "var(--c-border)";
                e.currentTarget.style.background = "var(--c-surface)";
              }
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>{pr.exercises?.name ?? "—"}</span>
            <span style={{ fontWeight: 700, color: "var(--c-pink)", fontSize: 15 }}>
              {formatW(pr.estimated_1rm != null ? roundKg(pr.estimated_1rm) : null)}{" "}
              <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 400 }}>kg / 1RM</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
