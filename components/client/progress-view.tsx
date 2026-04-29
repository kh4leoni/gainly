"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getRecentPRs } from "@/lib/queries/workouts";
import { derivedRepMax, roundKg } from "@/lib/calc/one-rm";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Exercise = { id: string; name: string };
type PR = {
  id: string;
  reps: number;
  weight: number | null;
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
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const prs = useQuery({
    queryKey: ["prs", clientId, "all"],
    queryFn: () => getRecentPRs(supabase, clientId, 250),
    staleTime: 60_000,
    enabled: online,
  }) as { data: PR[] | undefined };

  if (!online) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 12, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>📡</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Ennätykset</div>
        <div style={{ fontSize: 14, color: "var(--c-text-muted)", lineHeight: 1.6 }}>
          Ei käytössä ilman internet-yhteyttä.
        </div>
      </div>
    );
  }

  const selExName = exercises.find((e) => e.id === selId)?.name ?? "";

  // Group PRs by exercise id, then by reps. reps range: 1..5.
  const byExercise = new Map<string, Map<number, PR>>();
  let topE1rmByExercise = new Map<string, number>();
  for (const pr of prs.data ?? []) {
    const exId = pr.exercises?.id;
    if (!exId) continue;
    if (!byExercise.has(exId)) byExercise.set(exId, new Map());
    byExercise.get(exId)!.set(pr.reps, pr);
    if (pr.estimated_1rm != null) {
      const prev = topE1rmByExercise.get(exId) ?? 0;
      if (pr.estimated_1rm > prev) topE1rmByExercise.set(exId, pr.estimated_1rm);
    }
  }

  const selectedByReps = selId ? byExercise.get(selId) : undefined;
  const selectedTop1RM = selId ? (topE1rmByExercise.get(selId) ?? null) : null;

  // Sorted list of exercises with any PR, best first (by top e1RM).
  const rankedBests = Array.from(topE1rmByExercise.entries())
    .map(([exId, e1rm]) => {
      const name = byExercise.get(exId)!.values().next().value?.exercises?.name ?? "—";
      return { exId, e1rm, name };
    })
    .sort((a, b) => b.e1rm - a.e1rm);

  return (
    <div style={{ flex: 1, padding: "24px 20px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>Ennätykset</div>
      <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 22 }}>
        Parhaat suoritukset 1–5 toiston välillä + arviot.
      </div>

      {/* Exercise selector */}
      <div style={{ marginBottom: 20 }}>
        <SearchableSelect
          options={exercises.map((ex) => ({ value: ex.id, label: ex.name }))}
          value={selId}
          onChange={setSelId}
          placeholder="Valitse harjoitus..."
        />
      </div>

      {/* Per-rep table */}
      {selId && (
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{selExName}</div>
            {selectedTop1RM != null && (
              <div style={{ fontSize: 12, color: "var(--c-pink)", fontWeight: 700 }}>
                Paras e1RM {formatW(roundKg(selectedTop1RM))} kg
              </div>
            )}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 1fr",
            gap: 8,
            fontSize: 11,
            color: "var(--c-text-subtle)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            padding: "0 4px 6px",
            borderBottom: "1px solid var(--c-border)",
          }}>
            <span>Reps</span>
            <span>Ennätys</span>
            <span>Arvio @RPE 10</span>
          </div>

          {[1, 2, 3, 4, 5].map((n) => {
            const pr = selectedByReps?.get(n) ?? null;
            const derivedVal = selectedTop1RM != null ? derivedRepMax(selectedTop1RM, n, 10) : null;
            return (
              <div key={n} style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr",
                gap: 8,
                alignItems: "center",
                padding: "10px 4px",
                borderBottom: "1px solid var(--c-border)",
                fontSize: 14,
              }}>
                <span style={{ fontWeight: 700 }}>{n}</span>
                <span style={{ fontWeight: 600, color: pr ? "var(--c-text)" : "var(--c-text-subtle)" }}>
                  {pr?.weight != null ? `${formatW(pr.weight)} kg` : "—"}
                  {pr?.achieved_at && (
                    <span style={{ display: "block", fontSize: 10, color: "var(--c-text-muted)", fontWeight: 500, marginTop: 2 }}>
                      {new Date(pr.achieved_at).toLocaleDateString("fi-FI")}
                    </span>
                  )}
                </span>
                <span style={{ fontWeight: 600, color: derivedVal != null ? "var(--c-pink)" : "var(--c-text-subtle)" }}>
                  {derivedVal != null ? `${formatW(roundKg(derivedVal))} kg` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* All-time bests list */}
      <div style={{ fontSize: 12, color: "var(--c-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
        Parhaat liikkeet (e1RM)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rankedBests.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--c-text-muted)", fontSize: 13 }}>
            Ei ennätyksiä vielä.
          </div>
        )}
        {rankedBests.map(({ exId, e1rm, name }) => (
          <button
            key={exId}
            onClick={() => setSelId(exId)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: selId === exId ? "var(--c-pink-dim)" : "var(--c-surface)",
              border: `1px solid ${selId === exId ? "rgba(255,29,140,0.3)" : "var(--c-border)"}`,
              borderRadius: 14,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "inherit",
              color: "var(--c-text)",
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
            <span style={{ fontWeight: 700, color: "var(--c-pink)", fontSize: 15 }}>
              {formatW(roundKg(e1rm))}{" "}
              <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 400 }}>kg / e1RM</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
