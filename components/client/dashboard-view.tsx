"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getNextWorkout, getWeeklyVolume, getWeeklyCompletion, getLatestPRs } from "@/lib/queries/workouts";
import { usePrToast } from "@/hooks/use-pr-toast";
import { ExerciseInfoDialog } from "@/components/client/exercise-info-dialog";
import { usePendingNav } from "@/lib/nav-context";
import { EmptyState } from "@/components/ui/empty-state";
import { SurfaceCard, surfaceCardStyle } from "@/components/ui/surface-card";
import { Moon } from "@phosphor-icons/react";
import { Eyebrow, SectionLabel, Subtitle } from "@/components/ui/typography";

const FI_DAYS = ["sunnuntai","maanantai","tiistai","keskiviikko","torstai","perjantai","lauantai"];

const WEIGHT_REFS = [
  { min: 0,      max: 150,    text: "Olet nostanut painoa Vespan verran." },
  { min: 151,    max: 400,    text: "Olet nostanut painoa flyygelin verran." },
  { min: 401,    max: 800,    text: "Olet nostanut painoa harmaakarhun verran." },
  { min: 801,    max: 1500,   text: "Olet nostanut painoa pienen henkilöauton verran." },
  { min: 1501,   max: 3000,   text: "Olet nostanut painoa valkoisen sarvikuonon verran." },
  { min: 3001,   max: 6000,   text: "Olet nostanut painoa afrikannorsun verran." },
  { min: 6001,   max: 12000,  text: "Olet nostanut painoa Tyrannosaurus Rexin verran." },
  { min: 12001,  max: 25000,  text: "Olet nostanut painoa paikallisbussin verran." },
  { min: 25001,  max: 45000,  text: "Olet nostanut painoa täyteen lastatun paloauton verran." },
  { min: 45001,  max: 75000,  text: "Olet nostanut painoa Leopard 2 -panssarivaunun verran." },
  { min: 75001,  max: 130000, text: "Olet nostanut painoa sinivalaan verran." },
  { min: 130001, max: Infinity, text: "Olet nostanut painoa Boeing 747 -lentokoneen verran." },
] as const;

function getWeightRef(kg: number): string {
  return WEIGHT_REFS.find((r) => kg >= r.min && kg <= r.max)?.text ?? WEIGHT_REFS[WEIGHT_REFS.length - 1]!.text;
}

function getCompletionFeedback(pct: number): string {
  if (pct === 0)  return "Viikko alkaa – kaikki vielä edessä.";
  if (pct <= 33)  return "Hyvä alku, jatka samaan malliin.";
  if (pct <= 66)  return "Puolivälissä – pidä vauhti yllä.";
  if (pct < 100)  return "Melkein maalissa – loistava viikko.";
  return "Täydellinen viikko. Upea suoritus.";
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function ClientDashboardView({
  clientId,
  firstName,
  bwQuickLog,
}: {
  clientId: string;
  firstName: string | null;
  bwQuickLog?: React.ReactNode;
}) {
  const supabase = createClient();
  const { setPendingHref } = usePendingNav();
  usePrToast(clientId);

  const nextWorkout = useQuery({
    queryKey: ["next-workout", clientId],
    queryFn: () => getNextWorkout(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });
  const weeklyVolume = useQuery({
    queryKey: ["weekly-volume", clientId],
    queryFn: () => getWeeklyVolume(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });
  const weeklyCompletion = useQuery({
    queryKey: ["weekly-completion", clientId],
    queryFn: () => getWeeklyCompletion(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });
  const latestPRs = useQuery({
    queryKey: ["latest-prs", clientId],
    queryFn: () => getLatestPRs(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const now = new Date();
  const dateLabel = `${FI_DAYS[now.getDay()] ?? ""} ${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;

  const workout = nextWorkout.data;
  const exercises = workout?.program_days?.program_exercises ?? [];
  const exNames = exercises
    .slice()
    .sort((a, b) => a.order_idx - b.order_idx)
    .map((e) => e.exercises?.name)
    .filter(Boolean)
    .slice(0, 4);
  const volume = weeklyVolume.data ?? 0;
  const wc = weeklyCompletion.data;
  const wcTotal = wc?.total ?? 0;
  const wcDone = wc?.completed ?? 0;
  const wcPct = wcTotal > 0 ? Math.round((wcDone / wcTotal) * 100) : 0;

  const enterStyle = (delay: number): React.CSSProperties => ({
    animation: "card-enter 0.45s var(--ease-ios-snap) both",
    animationDelay: `${delay}ms`,
  });

  return (
    <div style={{ flex: 1, minHeight: 0, padding: "20px 20px 20px", display: "flex", flexDirection: "column" }}>
      {/* ── Fold section ──
          Cards flow naturally top-down. Hero ends up wherever the stack
          ends — close to the bottom on phones where the stack fills the
          fold, slightly higher when there's less content. Quote/week
          desc sit immediately below, no leftover gap. */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Slim greeting line — kept compact so the workout hero owns the fold */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, ...enterStyle(0) }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.1 }}>
          Hei{firstName ? `, ${firstName}` : ""}.
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-muted)", textTransform: "capitalize", flexShrink: 0 }}>
          {dateLabel}
        </div>
      </div>

      {/* Weekly stats — 2-column grid */}
      {(wcTotal > 0 || volume > 0) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: wcTotal > 0 && volume > 0 ? "1fr 1fr" : "1fr",
          gap: 12,
          marginBottom: 16,
          ...enterStyle(90),
        }}>
          {wcTotal > 0 && (
            <Link
              href="/client/history"
              className="card-grow"
              style={{
                ...surfaceCardStyle({ radius: "xl" }),
                display: "block",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Eyebrow style={{ letterSpacing: "1px", marginBottom: 8 }}>
                Viikon treenit
              </Eyebrow>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px", color: wcPct === 100 ? "var(--c-success)" : "var(--c-text)", lineHeight: 1 }}>
                {wcPct}%
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 6, marginBottom: 10 }}>
                {wcDone} / {wcTotal} tehty
              </div>
              <div style={{ height: 4, background: "var(--c-surface3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${wcPct}%`,
                  background: wcPct === 100
                    ? "linear-gradient(90deg, var(--c-success), color-mix(in srgb, var(--c-success) 75%, #000))"
                    : "var(--c-cta-bg)",
                  borderRadius: 2,
                  minWidth: wcDone > 0 ? 4 : 0,
                }} />
              </div>
            </Link>
          )}

          {volume > 0 && (
            <SurfaceCard radius="xl">
              <Eyebrow style={{ letterSpacing: "1px", marginBottom: 8 }}>
                Viikon volyymi
              </Eyebrow>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px", color: "var(--c-text)", lineHeight: 1 }}>
                {volume >= 1000
                  ? `${(volume / 1000).toLocaleString("fi-FI", { maximumFractionDigits: 1 })}t`
                  : `${volume.toLocaleString("fi-FI")} kg`}
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 6, lineHeight: 1.4 }}>
                {getWeightRef(volume).split("!")[0]!.trim() + "!"}
              </div>
            </SurfaceCard>
          )}
        </div>
      )}

      {/* Recent PRs */}
      {(latestPRs.data?.length ?? 0) > 0 && (
        <Link
          href="/client/progress"
          className="card-grow"
          style={{
            ...surfaceCardStyle({ radius: "xl", padding: 20 }),
            display: "block",
            marginBottom: 16,
            textDecoration: "none",
            color: "inherit",
            ...enterStyle(130),
          }}
        >
          <SectionLabel style={{ marginBottom: 14 }}>
            Viimeisimmät ennätykset
          </SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {latestPRs.data!.map((pr) => {
              const name = (pr.exercises as { name: string } | null)?.name ?? "—";
              const label = pr.reps === 1
                ? `1RM · ${pr.weight} kg`
                : `${pr.weight} kg × ${pr.reps}`;
              return (
                <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{name}</div>
                  <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </Link>
      )}

      {/* Bodyweight quick-log — sits right above the hero so logging the
          morning weight and starting the workout are a thumb-pair. */}
      {bwQuickLog && <div style={{ marginBottom: 16, ...enterStyle(170) }}>{bwQuickLog}</div>}

      {/* HERO: Next workout — the dashboard's reason to exist.
          `marginTop: auto` inside the fold section pushes it to the
          bottom of the visible viewport on landing. */}
      {workout ? (
        <div style={{
          background: "var(--c-hero-bg)",
          border: "1px solid var(--c-hero-border)",
          borderRadius: "var(--r-2xl)",
          padding: "22px 22px 20px",
          marginTop: "auto",
          marginBottom: 16,
          position: "relative",
          ...enterStyle(60),
        }}>
          {exercises.length > 0 && (
            <ExerciseInfoDialog
              exercises={exercises
                .slice()
                .sort((a, b) => a.order_idx - b.order_idx)
                .filter((e) => e.exercises != null)
                .map((e) => ({
                  name: e.exercises!.name,
                  instructions: e.exercises!.instructions,
                  video_path: e.exercises!.video_path,
                }))}
              title={workout.program_days?.name ?? "Harjoitteet"}
              trigger={
                <button
                  type="button"
                  title="Katso harjoitteiden kuvaukset"
                  style={{
                    position: "absolute", top: 14, right: 14,
                    width: 34, height: 34, borderRadius: "50%",
                    border: "1px solid var(--c-hero-border)",
                    background: "var(--c-pink-dim)",
                    color: "var(--c-text)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
              }
            />
          )}
          <div style={{ marginBottom: 14 }}>
            <Eyebrow tone="accent" style={{ letterSpacing: "1.5px", marginBottom: 6 }}>
              Seuraava treeni
            </Eyebrow>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.1 }}>
              {workout.program_days?.name ?? "Treeni"}
            </div>
          </div>

          {workout.program_days?.description && (
            <div style={{ fontSize: 13, color: "var(--c-text-muted)", fontStyle: "italic", lineHeight: 1.5, marginBottom: 14 }}>
              {workout.program_days.description}
            </div>
          )}

          {exNames.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 20 }}>
              {exNames.join(" · ")}{exercises.length > 4 ? ` +${exercises.length - 4}` : ""}
            </div>
          )}

          <Link
            href={`/client/workout/${workout.id}`}
            onClick={() => setPendingHref(`/client/workout/${workout.id}`)}
            className="card-grow"
            style={{
              display: "block",
              width: "100%",
              padding: "18px",
              background: "var(--c-cta-bg)",
              borderRadius: "var(--r-lg)",
              color: "var(--c-cta-fg, #fff)",
              fontSize: 17,
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
              boxShadow: "0 6px 24px var(--c-cta-glow)",
              letterSpacing: "-0.3px",
            }}
          >
            Aloita treeni
          </Link>
        </div>
      ) : (
        <SurfaceCard radius="2xl" padding={0} style={{ marginTop: "auto", marginBottom: 16, ...enterStyle(60) }}>
          <EmptyState
            icon={Moon}
            title="Ei tulevia treenejä"
            description="Ohjelmassasi ei ole tulevia treenejä."
            action={
              <Link
                href="/client/ohjelma"
                onClick={() => setPendingHref("/client/ohjelma")}
                style={{
                  display: "inline-block",
                  padding: "11px 18px",
                  borderRadius: "var(--r-md)",
                  background: "var(--c-surface2)",
                  border: "1px solid var(--c-border)",
                  color: "var(--c-text)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Selaa ohjelmaa
              </Link>
            }
          />
        </SurfaceCard>
      )}
      </section>

      {/* Week description */}
      {workout?.program_days?.program_weeks?.description && (
        <SurfaceCard style={{ padding: "14px 16px", marginBottom: 16, ...enterStyle(270) }}>
          <Eyebrow style={{ marginBottom: 6 }}>Viikkojen kuvaus</Eyebrow>
          <Subtitle>{workout.program_days.program_weeks.description}</Subtitle>
        </SurfaceCard>
      )}
    </div>
  );
}
