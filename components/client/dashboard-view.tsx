"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getNextWorkout, getWeeklyVolume, getWeeklyCompletion, getLatestPRs } from "@/lib/queries/workouts";
import { usePrToast } from "@/hooks/use-pr-toast";
import { ExerciseInfoDialog } from "@/components/client/exercise-info-dialog";
import { usePendingNav } from "@/lib/nav-context";
import { EmptyState } from "@/components/ui/empty-state";
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

// ── Quotes ────────────────────────────────────────────────────────────────────

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Push yourself — no one else is going to do it for you.",
  "It never gets easier. You just get stronger.",
  "The body achieves what the mind believes.",
  "Discipline is choosing what you want most over what you want now.",
  "Don't stop when you're tired. Stop when you're done.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "If it doesn't challenge you, it won't change you.",
  "Your only limit is you.",
  "Good things come to those who sweat.",
  "You are one workout away from a good mood.",
  "The harder you work, the luckier you get.",
  "Fall seven times. Stand up eight.",
  "What seems impossible today will be your warm-up tomorrow.",
  "Strength comes from overcoming what you thought you couldn't.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Don't wish for it. Work for it.",
  "Be stronger than your excuses.",
  "Sweat now. Shine later.",
  "Results happen over time, not overnight. Work hard. Stay consistent.",
  "Every champion was once a contender who refused to give up.",
  "Make yourself proud.",
  "Success is the sum of small efforts repeated day in and day out.",
  "You don't get what you wish for. You get what you work for.",
  "Show up. Work hard. Don't stop.",
  "Small steps every day lead to big results.",
  "Progress, not perfection.",
  "Believe in the process.",
  "Your future self will thank you.",
  "One more rep. One more step. One more day.",
] as const;

const INTERVAL_MS = 24_000;
const ANIM_MS = 480;

function QuoteCard() {
  const [current, setCurrent] = useState(0);
  useEffect(() => { setCurrent(Math.floor(Math.random() * QUOTES.length)); }, []);
  const [departing, setDeparting] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const animating = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const navigate = useCallback((dir: "left" | "right") => {
    if (animating.current) return;
    animating.current = true;
    setCurrent((prev) => {
      const next = dir === "left"
        ? (prev + 1) % QUOTES.length
        : (prev - 1 + QUOTES.length) % QUOTES.length;
      setDeparting(prev);
      setSlideDir(dir);
      return next;
    });
    setTimeout(() => {
      setDeparting(null);
      animating.current = false;
    }, ANIM_MS);
  }, []);

  useEffect(() => {
    const t = setInterval(() => navigate("left"), INTERVAL_MS);
    return () => clearInterval(t);
  }, [navigate, current]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - (touchStartY.current ?? 0);
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      navigate(dx < 0 ? "left" : "right");
    }
  };

  const currentQuote = QUOTES[current] ?? "";
  const departingQuote = departing !== null ? (QUOTES[departing] ?? "") : "";

  return (
    <div
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--c-pink) 12%, transparent) 0%, color-mix(in srgb, var(--c-pink) 8%, transparent) 100%)",
        border: "1px solid color-mix(in srgb, var(--c-pink) 20%, transparent)",
        borderRadius: 18,
        padding: "22px 22px 18px",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
        touchAction: "pan-y",
        userSelect: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div style={{ position: "relative", minHeight: 108 }}>
        {/* Departing quote */}
        {departing !== null && (
          <div
            key={`d-${departing}`}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              animation: `${slideDir === "left" ? "quote-out-left" : "quote-out-right"} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) both`,
            }}
          >
            <QuoteContent text={departingQuote} />
          </div>
        )}

        {/* Current quote */}
        <div
          key={`c-${current}`}
          style={{
            animation: departing !== null
              ? `${slideDir === "left" ? "quote-in-right" : "quote-in-left"} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) both`
              : "none",
          }}
        >
          <QuoteContent text={currentQuote} />
        </div>
      </div>

      {/* Auto-advance progress bar */}
      <div style={{ height: 2, background: "var(--c-surface3)", borderRadius: 1, overflow: "hidden", marginTop: 18 }}>
        <div
          key={`p-${current}`}
          style={{
            height: "100%",
            background: "linear-gradient(90deg, var(--c-pink), color-mix(in srgb, var(--c-pink) 75%, var(--c-bg)))",
            animation: `quote-progress ${INTERVAL_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

function QuoteContent({ text }: { text: string }) {
  return (
    <>
      <div style={{ fontSize: 9, color: "var(--c-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
        ✦ Daily Motivation
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.4, color: "var(--c-text)" }}>
        &ldquo;{text}&rdquo;
      </div>
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function ClientDashboardView({ clientId, firstName }: { clientId: string; firstName: string | null }) {
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
    animation: "card-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
    animationDelay: `${delay}ms`,
  });

  return (
    <div style={{ flex: 1, padding: "8px 20px 20px" }}>
      {/* Slim greeting line — kept compact so the workout hero owns the fold */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, ...enterStyle(0) }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.1 }}>
          Hei{firstName ? `, ${firstName}` : ""}.
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-muted)", textTransform: "capitalize", flexShrink: 0 }}>
          {dateLabel}
        </div>
      </div>

      {/* HERO: Next workout — the dashboard's reason to exist */}
      {workout ? (
        <div style={{
          background: "linear-gradient(135deg,color-mix(in srgb, var(--c-pink) 18%, transparent) 0%,color-mix(in srgb, var(--c-pink) 12%, transparent) 100%)",
          border: "1px solid color-mix(in srgb, var(--c-pink) 30%, transparent)",
          borderRadius: 22,
          padding: "22px 22px 20px",
          marginBottom: 22,
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
                    border: "1px solid color-mix(in srgb, var(--c-pink) 35%, transparent)",
                    background: "color-mix(in srgb, var(--c-pink) 10%, transparent)",
                    color: "var(--c-pink)",
                    fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  ?
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
            style={{
              display: "block",
              width: "100%",
              padding: "18px",
              background: "var(--c-pink)",
              borderRadius: 14,
              color: "var(--c-pink-fg, #fff)",
              fontSize: 17,
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
              boxShadow: "0 6px 24px var(--c-pink-glow)",
              letterSpacing: "-0.3px",
            }}
          >
            Aloita treeni
          </Link>
        </div>
      ) : (
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 22,
          marginBottom: 22,
          ...enterStyle(60),
        }}>
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
                  borderRadius: 10,
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
        </div>
      )}

      {/* Weekly stats — 2-column grid */}
      {(wcTotal > 0 || volume > 0) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: wcTotal > 0 && volume > 0 ? "1fr 1fr" : "1fr",
          gap: 12,
          marginBottom: 20,
          ...enterStyle(130),
        }}>
          {wcTotal > 0 && (
            <Link
              href="/client/history"
              style={{
                display: "block",
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 18,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Eyebrow style={{ letterSpacing: "1px", marginBottom: 8 }}>
                Viikon treenit
              </Eyebrow>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px", color: wcPct === 100 ? "var(--c-success)" : "var(--c-pink)", lineHeight: 1 }}>
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
                    : "linear-gradient(90deg,var(--c-pink),color-mix(in srgb, var(--c-pink) 75%, var(--c-bg)))",
                  borderRadius: 2,
                  minWidth: wcDone > 0 ? 4 : 0,
                }} />
              </div>
            </Link>
          )}

          {volume > 0 && (
            <div style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 18,
              padding: 16,
            }}>
              <Eyebrow style={{ letterSpacing: "1px", marginBottom: 8 }}>
                Viikon volyymi
              </Eyebrow>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px", color: "var(--c-pink)", lineHeight: 1 }}>
                {volume >= 1000
                  ? `${(volume / 1000).toLocaleString("fi-FI", { maximumFractionDigits: 1 })}t`
                  : `${volume.toLocaleString("fi-FI")} kg`}
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 6, lineHeight: 1.4 }}>
                {getWeightRef(volume).split("!")[0]!.trim() + "!"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent PRs */}
      {(latestPRs.data?.length ?? 0) > 0 && (
        <Link
          href="/client/progress"
          style={{
            display: "block",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 18,
            padding: 20,
            marginBottom: 20,
            textDecoration: "none",
            color: "inherit",
            ...enterStyle(200),
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
                  <div style={{ fontSize: 13, color: "var(--c-pink)", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </Link>
      )}

      {/* Week description */}
      {workout?.program_days?.program_weeks?.description && (
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 20,
          ...enterStyle(270),
        }}>
          <Eyebrow style={{ marginBottom: 6 }}>Viikkojen kuvaus</Eyebrow>
          <Subtitle>{workout.program_days.program_weeks.description}</Subtitle>
        </div>
      )}

      {/* Motivational quotes — moved below the workout so it doesn't push the
          primary action below the fold. Stays as a small daily moment. */}
      <div style={enterStyle(340)}><QuoteCard /></div>
    </div>
  );
}
