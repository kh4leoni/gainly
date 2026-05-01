"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MeasurementChart } from "@/components/client/measurement-chart";
import { getRecentPRs } from "@/lib/queries/workouts";
import { derivedRepMax, roundKg, roundTo } from "@/lib/calc/one-rm";
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
type Measurement = { value: number; logged_at: string };

function formatW(w: number | null) {
  if (w === null) return "—";
  return w % 1 === 0 ? `${w}` : `${w.toFixed(1)}`;
}


function latestValue(data: Measurement[]) {
  return data[0]?.value ?? null;
}

// Attempt pcts: [opener, 2nd, 3rd] relative to e1RM
// Example e1RM 205kg → Normal: 185-195-205, Conservative: 182.5-192.5-202.5, Risky: 187.5-200-210
const ATTEMPT_MODES = {
  conservative: { label: "Turvallinen", pcts: [0.89, 0.94, 0.98] as const },
  normal:       { label: "Normaali",    pcts: [0.90, 0.955, 1.00] as const },
  risky:        { label: "Kova riski",  pcts: [0.915, 0.975, 1.03] as const },
} as const;
type AttemptMode = keyof typeof ATTEMPT_MODES;

const BIG_THREE = [
  { key: "squat", label: "Kyykky",         keywords: ["takakyykky", "kyykky"] },
  { key: "bench", label: "Penkkipunnerrus", keywords: ["penkkipunnerrus"] },
  { key: "dead",  label: "Maastaveto",      keywords: ["maastaveto"] },
] as const;

function matchBigThree(name: string) {
  const n = name.toLowerCase();
  for (const lift of BIG_THREE) {
    if (lift.keywords.some((k) => n.includes(k))) return lift.key;
  }
  return null;
}

function attempts(e1rm: number, pcts: readonly [number, number, number]) {
  return pcts.map((p) => roundTo(e1rm * p, 2.5));
}

export function ProgressView({
  clientId,
  exercises,
  bwHistory,
  waistHistory,
}: {
  clientId: string;
  exercises: Exercise[];
  bwHistory: Measurement[];
  waistHistory: Measurement[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<"ennätykset" | "kehitys" | "voimanosto">("ennätykset");
  const [attemptMode, setAttemptMode] = useState<AttemptMode>("normal");
  const [planOpen, setPlanOpen] = useState(false);
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

  const selExName = exercises.find((e) => e.id === selId)?.name ?? "";

  const byExercise = new Map<string, Map<number, PR>>();
  const topE1rmByExercise = new Map<string, number>();
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

  const rankedBests = Array.from(topE1rmByExercise.entries())
    .map(([exId, e1rm]) => {
      const name = byExercise.get(exId)!.values().next().value?.exercises?.name ?? "—";
      return { exId, e1rm, name };
    })
    .sort((a, b) => b.e1rm - a.e1rm);

  // Big three e1RMs from PR data
  const bigThreeE1rm: Record<string, number | null> = { squat: null, bench: null, dead: null };
  for (const [exId, e1rm] of topE1rmByExercise.entries()) {
    const name = byExercise.get(exId)!.values().next().value?.exercises?.name ?? "";
    const key = matchBigThree(name);
    if (key && bigThreeE1rm[key] === null) bigThreeE1rm[key] = e1rm;
  }
  const { squat: sqE1, bench: bE1, dead: dE1 } = bigThreeE1rm;
  const bigThreeTotal = sqE1 != null && bE1 != null && dE1 != null ? sqE1 + bE1 + dE1 : null;

  const segStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "7px 0",
    borderRadius: 8,
    border: "none",
    background: active ? "var(--c-surface)" : "transparent",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    color: active ? "var(--c-text)" : "var(--c-text-muted)",
    transition: "all 0.15s",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
    fontFamily: "inherit",
  });

  return (
    <div style={{ flex: 1, padding: "24px 20px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 16 }}>
        {tab === "ennätykset" ? "Ennätykset" : tab === "kehitys" ? "Kehitys" : "Voimanosto"}
      </div>

      {/* Segmented toggle */}
      <div style={{
        display: "flex",
        background: "var(--c-surface2)",
        borderRadius: 10,
        padding: 3,
        marginBottom: 22,
      }}>
        <button style={segStyle(tab === "ennätykset")} onClick={() => setTab("ennätykset")}>
          Ennätykset
        </button>
        <button style={segStyle(tab === "kehitys")} onClick={() => setTab("kehitys")}>
          Kehitys
        </button>
        <button style={segStyle(tab === "voimanosto")} onClick={() => setTab("voimanosto")}>
          Voimanosto
        </button>
      </div>

      {/* ── Ennätykset ── */}
      {tab === "ennätykset" && (
        <>
          {!online ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 12, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>📡</div>
              <div style={{ fontSize: 14, color: "var(--c-text-muted)", lineHeight: 1.6 }}>
                Ei käytössä ilman internet-yhteyttä.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 18 }}>
                Parhaat suoritukset 1–5 toiston välillä + arviot.
              </div>
              <div style={{ marginBottom: 20 }}>
                <SearchableSelect
                  options={exercises.map((ex) => ({ value: ex.id, label: ex.name }))}
                  value={selId}
                  onChange={setSelId}
                  placeholder="Valitse harjoitus..."
                />
              </div>
              {selId && (
                <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "14px 16px", marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selExName}</div>
                    {selectedTop1RM != null && (
                      <div style={{ fontSize: 12, color: "var(--c-pink)", fontWeight: 700 }}>
                        Paras e1RM {formatW(roundKg(selectedTop1RM))} kg
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8, fontSize: 11, color: "var(--c-text-subtle)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 4px 6px", borderBottom: "1px solid var(--c-border)" }}>
                    <span>Reps</span><span>Ennätys</span><span>Arvio @RPE 10</span>
                  </div>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const pr = selectedByReps?.get(n) ?? null;
                    const derivedVal = selectedTop1RM != null ? derivedRepMax(selectedTop1RM, n, 10) : null;
                    return (
                      <div key={n} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8, alignItems: "center", padding: "10px 4px", borderBottom: "1px solid var(--c-border)", fontSize: 14 }}>
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
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px",
                      background: selId === exId ? "var(--c-pink-dim)" : "var(--c-surface)",
                      border: `1px solid ${selId === exId ? "rgba(255,29,140,0.3)" : "var(--c-border)"}`,
                      borderRadius: 14, cursor: "pointer", transition: "all 0.15s",
                      fontFamily: "inherit", color: "var(--c-text)", textAlign: "left",
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
            </>
          )}
        </>
      )}

      {/* ── Kehitys ── */}
      {tab === "kehitys" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Bodyweight card */}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "16px 16px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Paino</div>
              {latestValue(bwHistory) !== null && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>
                  {latestValue(bwHistory)} kg
                </div>
              )}
            </div>
            <MeasurementChart
              data={bwHistory}
              unit="kg"
              color="#818cf8"
              emptyText="Ei painomerkintöjä vielä. Lisää asetuksista."
            />
          </div>

          {/* Waist card */}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "16px 16px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Vyötärö</div>
              {latestValue(waistHistory) !== null && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>
                  {latestValue(waistHistory)} cm
                </div>
              )}
            </div>
            <MeasurementChart
              data={waistHistory}
              unit="cm"
              color="#34d399"
              emptyText="Ei vyötärösmittauksia vielä. Lisää asetuksista."
            />
          </div>
        </div>
      )}

      {/* ── Voimanosto ── */}
      {tab === "voimanosto" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Section 1: Estimated total ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--c-text-muted)", marginBottom: 10 }}>
              Arvioitu yhteistulos
            </div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: "var(--c-text-muted)" }}>Yhteensä (e1RM)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--c-pink)" }}>
                  {bigThreeTotal != null ? `${formatW(roundKg(bigThreeTotal))} kg` : "—"}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {BIG_THREE.map(({ key, label }) => {
                  const e1rm = bigThreeE1rm[key];
                  return (
                    <div key={key} style={{ background: "var(--c-surface2)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: e1rm != null ? "var(--c-text)" : "var(--c-text-subtle)" }}>
                        {e1rm != null ? `${formatW(roundKg(e1rm))}` : "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--c-text-subtle)" }}>kg</div>
                    </div>
                  );
                })}
              </div>
              {bigThreeTotal == null && (
                <div style={{ fontSize: 12, color: "var(--c-text-muted)", textAlign: "center", marginTop: 12 }}>
                  Kirjaa kyykky, penkki ja maastaveto saadaksesi yhteistuloksen
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Competition attempt planner ── */}
          <div>
            <button
              onClick={() => setPlanOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: 0, marginBottom: planOpen ? 10 : 0, fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--c-text-muted)" }}>
                Kilpailutyökalu
              </div>
              <div style={{ fontSize: 16, color: "var(--c-text-muted)", transition: "transform 0.2s", transform: planOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                ▾
              </div>
            </button>

            <div style={{
              overflow: "hidden",
              maxHeight: planOpen ? 800 : 0,
              transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 2 }}>
                {/* Mode selector */}
                <div style={{ background: "var(--c-surface2)", borderRadius: 10, padding: 3, display: "flex" }}>
                  {(Object.entries(ATTEMPT_MODES) as [AttemptMode, typeof ATTEMPT_MODES[AttemptMode]][]).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setAttemptMode(key)}
                      style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                        background: attemptMode === key ? "var(--c-surface)" : "transparent",
                        fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        color: attemptMode === key ? "var(--c-text)" : "var(--c-text-muted)",
                        boxShadow: attemptMode === key ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
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
                  const atts = e1rm != null ? attempts(e1rm, ATTEMPT_MODES[attemptMode].pcts) : null;
                  return (
                    <div key={key} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: atts ? 12 : 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                        {e1rm != null
                          ? <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>e1RM {formatW(roundKg(e1rm))} kg</div>
                          : <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>Ei dataa</div>}
                      </div>
                      {atts && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {atts.map((kg, i) => (
                            <div key={i} style={{
                              background: i === 2 ? "var(--c-pink-dim)" : "var(--c-surface2)",
                              border: i === 2 ? "1px solid rgba(255,29,140,0.25)" : "1px solid transparent",
                              borderRadius: 10, padding: "10px 8px", textAlign: "center",
                            }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: i === 2 ? "var(--c-pink)" : "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                                {i + 1}. nosto
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: i === 2 ? "var(--c-pink)" : "var(--c-text)" }}>{kg}</div>
                              <div style={{ fontSize: 10, color: "var(--c-text-subtle)" }}>kg</div>
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
                    return e1rm != null ? attempts(e1rm, ATTEMPT_MODES[attemptMode].pcts)[2] ?? null : null;
                  });
                  const total = thirds.every(v => v != null) ? thirds.reduce((s, v) => s! + v!, 0) : null;
                  return total != null ? (
                    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Yhteistulos (kilpailu)</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--c-pink)" }}>{total} kg</div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
