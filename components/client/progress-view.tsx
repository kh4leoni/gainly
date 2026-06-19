"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MeasurementChart } from "@/components/client/measurement-chart";
import { MeasurementSection, type MeasurementEntry } from "@/components/client/measurement-section";
import { logBodyweight, logWaist, deleteBodyweight, deleteWaist } from "@/app/client/actions";
import { getRecentPRs, getCardioRecords, getOneRmCurve, type CardioRecord } from "@/lib/queries/workouts";
import { OneRmTrend } from "@/components/client/one-rm-chart";
import { derivedRepMax, roundKg } from "@/lib/calc/one-rm";
import { KilpailutyokaluCard } from "@/components/client/kilpailutyokalu-card";
import { matchBigThree, BIG_THREE } from "@/lib/powerlifting";
import type { BigThreeKey } from "@/lib/powerlifting";
import { EmptyState } from "@/components/ui/empty-state";
import { SurfaceCard, surfaceCardStyle } from "@/components/ui/surface-card";
import { WifiSlash, Trophy } from "@phosphor-icons/react";
import { Eyebrow, SectionLabel, Subtitle } from "@/components/ui/typography";

type Exercise = { id: string; name: string };
type PR = {
  id: string;
  reps: number;
  weight: number | null;
  estimated_1rm: number | null;
  achieved_at: string;
  exercises: { id: string; name: string } | null;
};
type Measurement = MeasurementEntry;

const TABS = ["ennätykset", "kehitys", "voimanosto"] as const;
type Tab = typeof TABS[number];

const TAB_LABEL: Record<Tab, string> = {
  "ennätykset": "Ennätykset",
  "kehitys": "Kehitys",
  "voimanosto": "Voimanosto",
};

function formatW(w: number | null) {
  if (w === null) return "—";
  return w % 1 === 0 ? `${w}` : `${w.toFixed(1)}`;
}

function latestValue(data: Measurement[]) {
  return data[0]?.value ?? null;
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
  const [tab, setTab] = useState<Tab>("ennätykset");
  const [selId, setSelId] = useState(exercises[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

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

  const cardioPRs = useQuery({
    queryKey: ["cardio-prs", clientId],
    queryFn: () => getCardioRecords(supabase, clientId),
    staleTime: 60_000,
    enabled: online,
  });

  const oneRmCurve = useQuery({
    queryKey: ["one-rm-curve", clientId, selId],
    queryFn: () => getOneRmCurve(supabase, clientId, selId),
    staleTime: 60_000,
    enabled: online && !!selId,
  });

  // Initial scroll position (default = "ennätykset" at scrollLeft 0)
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || didInit.current) return;
    didInit.current = true;
    el.scrollLeft = 0;
  }, []);

  // Scroll position is the source of truth — sync tab state from it
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    function handle() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el!.clientWidth;
        if (w === 0) return;
        const idx = Math.round(el!.scrollLeft / w);
        const next = TABS[idx];
        if (next) setTab((prev) => (prev === next ? prev : next));
      });
    }
    el.addEventListener("scroll", handle, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", handle);
    };
  }, []);

  function jumpTo(t: Tab) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: TABS.indexOf(t) * el.clientWidth, behavior: "smooth" });
  }

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

  const q = query.trim().toLowerCase();
  const filteredBests = q
    ? rankedBests.filter((b) => b.name.toLowerCase().includes(q))
    : rankedBests;

  // Big three e1RMs from PR data
  const bigThreeE1rm: Record<BigThreeKey, number | null> = { squat: null, bench: null, dead: null };
  for (const [exId, e1rm] of topE1rmByExercise.entries()) {
    const name = byExercise.get(exId)!.values().next().value?.exercises?.name ?? "";
    const key = matchBigThree(name);
    // Take the strongest matching variant (max), same as the coach view — first-wins
    // diverged from the coach's max when a client has several bench/squat variants.
    if (key && (bigThreeE1rm[key] == null || e1rm > bigThreeE1rm[key]!)) bigThreeE1rm[key] = e1rm;
  }
  const { squat: sqE1, bench: bE1, dead: dE1 } = bigThreeE1rm;
  const bigThreeTotal = sqE1 != null && bE1 != null && dE1 != null ? sqE1 + bE1 + dE1 : null;

  const segStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "7px 0",
    borderRadius: "var(--r-sm)",
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

  const paneInner: React.CSSProperties = { padding: "0 20px" };

  return (
    <div style={{ flex: 1, paddingTop: 8, paddingBottom: 20 }}>
      <div style={{ padding: "0 20px" }}>
        <SectionLabel style={{ marginBottom: 12, letterSpacing: "0.6px" }}>
          {TAB_LABEL[tab]}
        </SectionLabel>

        {/* Segmented toggle — clicks scroll the pager */}
        <div style={{
          display: "flex",
          background: "var(--c-surface2)",
          borderRadius: "var(--r-md)",
          padding: 3,
          marginBottom: 10,
        }}>
          {TABS.map((t) => (
            <button key={t} style={segStyle(tab === t)} onClick={() => jumpTo(t)}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

      </div>

      <div
        ref={scrollerRef}
        className="progress-pager"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          touchAction: "pan-y",
        }}
      >
        {/* ── Ennätykset ── */}
        <div style={paneStyle}>
          <div style={paneInner}>
            {!online ? (
              <EmptyState
                icon={WifiSlash}
                title="Ei verkkoyhteyttä"
                description="Ennätykset ovat käytettävissä, kun yhteys palaa."
              />
            ) : (
              <>
                <Subtitle style={{ marginBottom: 18, fontSize: 12 }}>
                  Parhaat suoritukset 1–5 toiston välillä + arviot.
                </Subtitle>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Hae liikenimellä, esim. squat"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 36px 10px 14px",
                      borderRadius: "var(--r-md)",
                      background: "var(--c-surface)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text)",
                      fontSize: 14,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Tyhjennä haku"
                      style={{
                        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--c-text-muted)", fontSize: 18, padding: 4, lineHeight: 1,
                      }}
                    >×</button>
                  )}
                </div>
                {selId && (
                  <SurfaceCard style={{ padding: "14px 16px", marginBottom: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{selExName}</div>
                      {selectedTop1RM != null && (
                        <div style={{ fontSize: 12, color: "var(--c-pink)", fontWeight: 700 }}>
                          Paras e1RM {formatW(roundKg(selectedTop1RM))} kg
                        </div>
                      )}
                    </div>
                    {(oneRmCurve.data?.length ?? 0) >= 2 && (
                      <div style={{ marginBottom: 16 }}>
                        <Eyebrow style={{ marginBottom: 6 }}>Arvioitu 1RM · kehitys</Eyebrow>
                        <OneRmTrend data={oneRmCurve.data ?? []} />
                      </div>
                    )}
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
                  </SurfaceCard>
                )}
                <SectionLabel style={{ marginBottom: 10 }}>
                  Parhaat liikkeet (e1RM)
                </SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rankedBests.length === 0 && (
                    <EmptyState
                      icon={Trophy}
                      title="Ei ennätyksiä vielä"
                      description="Kirjaa sarjoja ja ennätykset alkavat kertyä."
                      compact
                    />
                  )}
                  {rankedBests.length > 0 && filteredBests.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--c-text-muted)", fontSize: 13 }}>
                      Ei osumia haulle &ldquo;{query}&rdquo;.
                    </div>
                  )}
                  {filteredBests.map(({ exId, e1rm, name }) => (
                    <button
                      key={exId}
                      onClick={() => setSelId(exId)}
                      style={{
                        ...surfaceCardStyle({ padding: "14px 16px" }),
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        ...(selId === exId && {
                          background: "var(--c-pink-dim)",
                          border: "1px solid color-mix(in srgb, var(--c-pink) 30%, transparent)",
                        }),
                        cursor: "pointer", transition: "all 0.15s",
                        fontFamily: "inherit", color: "var(--c-text)", textAlign: "left",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                      <span style={{ fontWeight: 700, color: "var(--c-pink)", fontSize: 15 }}>
                        {formatW(roundKg(e1rm))}{" "}
                        <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 400 }}>kg</span>
                      </span>
                    </button>
                  ))}
                </div>

                {(cardioPRs.data?.length ?? 0) > 0 && (
                  <>
                    <SectionLabel style={{ margin: "26px 0 10px" }}>
                      Kardio-ennätykset
                    </SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sortCardioPRs(cardioPRs.data ?? []).map((pr) => (
                        <CardioPRRow key={pr.id} pr={pr} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Kehitys ── */}
        <div style={paneStyle}>
          <div style={paneInner}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SurfaceCard style={{ padding: "16px 16px 12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Paino</div>
                  {latestValue(bwHistory) !== null && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-info)" }}>
                      {latestValue(bwHistory)} kg
                    </div>
                  )}
                </div>
                <MeasurementChart
                  data={bwHistory}
                  unit="kg"
                  color="var(--c-info)"
                  emptyText="Ei painomerkintöjä vielä."
                />
                <div style={{ height: 12 }} />
                <div style={{ height: 1, background: "var(--c-border)", margin: "0 -16px 12px" }} />
                <MeasurementSection
                  label="Lisää"
                  unit="kg"
                  max={500}
                  initialHistory={bwHistory}
                  onSave={logBodyweight}
                  onDelete={deleteBodyweight}
                />
              </SurfaceCard>

              <SurfaceCard style={{ padding: "16px 16px 12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Vyötärö</div>
                  {latestValue(waistHistory) !== null && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-info-alt)" }}>
                      {latestValue(waistHistory)} cm
                    </div>
                  )}
                </div>
                <MeasurementChart
                  data={waistHistory}
                  unit="cm"
                  color="var(--c-info-alt)"
                  emptyText="Ei vyötärösmittauksia vielä."
                />
                <div style={{ height: 12 }} />
                <div style={{ height: 1, background: "var(--c-border)", margin: "0 -16px 12px" }} />
                <MeasurementSection
                  label="Lisää"
                  unit="cm"
                  max={300}
                  initialHistory={waistHistory}
                  onSave={logWaist}
                  onDelete={deleteWaist}
                />
              </SurfaceCard>
            </div>
          </div>
        </div>

        {/* ── Voimanosto ── */}
        <div style={paneStyle}>
          <div style={paneInner}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <SectionLabel style={{ marginBottom: 10 }}>
                  Arvioitu yhteistulos
                </SectionLabel>
                <SurfaceCard style={{ padding: "16px" }}>
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
                        <div key={key} style={{ background: "var(--c-surface2)", borderRadius: "var(--r-md)", padding: "10px 8px", textAlign: "center" }}>
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
                </SurfaceCard>
              </div>

              <KilpailutyokaluCard bigThreeE1rm={bigThreeE1rm} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const paneStyle: React.CSSProperties = {
  flex: "0 0 100%",
  width: "100%",
  minWidth: "100%",
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  boxSizing: "border-box",
};

// ── Cardio PR helpers ────────────────────────────────────────────────────────
const BUCKET_ORDER: CardioRecord["bucket"][] = ["cooper", "1km", "5km", "10km", "21km", "42km"];
const BUCKET_LABEL: Record<CardioRecord["bucket"], string> = {
  cooper: "Cooper (12 min)",
  "1km": "1 km",
  "5km": "5 km",
  "10km": "10 km",
  "21km": "½-maraton (21 km)",
  "42km": "Maraton (42 km)",
};

function sortCardioPRs(prs: CardioRecord[]): CardioRecord[] {
  return [...prs].sort(
    (a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket),
  );
}

function formatDur(s: number | null): string {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatKm(m: number | null): string {
  if (m == null) return "—";
  return (m / 1000).toFixed(2).replace(/\.?0+$/, "") + " km";
}

function CardioPRRow({ pr }: { pr: CardioRecord }) {
  const isCooper = pr.bucket === "cooper";
  const primary = isCooper ? formatKm(pr.distance_m) : formatDur(pr.duration_s);
  const secondary = isCooper ? formatDur(pr.duration_s) : formatKm(pr.distance_m);
  return (
    <SurfaceCard
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{BUCKET_LABEL[pr.bucket]}</div>
        <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>
          {pr.exercises?.name ?? "—"} · {new Date(pr.achieved_at).toLocaleDateString("fi-FI")}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700, color: "var(--c-pink)", fontSize: 15 }}>{primary}</div>
        <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>{secondary}</div>
      </div>
    </SurfaceCard>
  );
}
