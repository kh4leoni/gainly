import type React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avatarColor } from "@/lib/utils";
import { OhjelmoiButton } from "@/components/program-builder/ohjelmoi-button";
import { ClientTrainingView } from "@/components/client-detail/client-training-view";
import { RecordsSection } from "@/components/client-detail/pr-sections";
import { MeasurementChart } from "@/components/client/measurement-chart";
import { KilpailutyokaluCard, matchBigThree } from "@/components/client/kilpailutyokalu-card";
import type { BigThreeKey } from "@/components/client/kilpailutyokalu-card";
import { MessageSquare, ChevronLeft, Check, Zap, LayoutGrid, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Single scheduled_workouts query replaces two (upcoming + adherence)
  const [profileRes, allScheduledRes, threadRes, activeProgRes, pastWorkoutsRes, prExercisesRes, bwRes, waistRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", id).single(),
    supabase
      .from("scheduled_workouts")
      .select(`
        id, status, completed_at,
        program_days(
          name, description, day_number,
          program_weeks(is_active),
          program_exercises(order_idx, exercises(name))
        )
      `)
      .eq("client_id", id),
    supabase.from("threads").select("id").eq("client_id", id).maybeSingle(),
    supabase
      .from("programs")
      .select("id, title, program_weeks(week_number, description, is_active)")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scheduled_workouts")
      .select(`
        id, completed_at, status,
        program_days (name, day_number),
        workout_logs (
          id, logged_at, notes,
          workout_exercise_notes ( notes, program_exercises ( exercises ( name ) ) ),
          set_logs (
            set_number, weight, reps, rpe, is_pr,
            exercises (name)
          )
        )
      `)
      .eq("client_id", id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50),
    // Only exercises this client has PRs for — much smaller than all exercises
    supabase
      .from("personal_records")
      .select("exercise_id, estimated_1rm, exercises(id, name)")
      .eq("client_id", id),
    supabase
      .from("bodyweights")
      .select("weight_kg, logged_at")
      .eq("client_id", id)
      .order("logged_at", { ascending: false })
      .limit(30),
    supabase
      .from("waist_measurements")
      .select("waist_cm, logged_at")
      .eq("client_id", id)
      .order("logged_at", { ascending: false })
      .limit(30),
  ]);

  if (profileRes.error || !profileRes.data) notFound();
  const profile = profileRes.data;

  // Deduplicate exercises from PRs
  const exerciseMap = new Map<string, { id: string; name: string }>();
  for (const row of prExercisesRes.data ?? []) {
    const ex = (row as any).exercises;
    if (ex && !exerciseMap.has(ex.id)) exerciseMap.set(ex.id, { id: ex.id, name: ex.name });
  }
  const exercises = Array.from(exerciseMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const bigThreeE1rm: Record<BigThreeKey, number | null> = { squat: null, bench: null, dead: null };
  for (const row of prExercisesRes.data ?? []) {
    const ex = (row as any).exercises;
    const e1rm = (row as any).estimated_1rm as number | null;
    if (!ex || e1rm == null) continue;
    const key = matchBigThree(ex.name as string);
    if (key && (bigThreeE1rm[key] == null || e1rm > bigThreeE1rm[key]!)) bigThreeE1rm[key] = e1rm;
  }

  const name: string = profile.full_name ?? "Unnamed";
  const initials = name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
  const gradient = avatarColor(name);

  const allScheduled = allScheduledRes.data ?? [];

  // Compute adherence % for active week from combined query
  const adherenceData = allScheduled.filter(
    (w: any) => w.program_days?.program_weeks?.is_active === true
  );
  const adherenceTotal = adherenceData.length;
  const adherenceCompleted = adherenceData.filter((w: any) => w.status === "completed").length;
  const adherencePct = adherenceTotal > 0 ? Math.round((adherenceCompleted / adherenceTotal) * 100) : null;

  // Compute streak (consecutive days with completed workout, using completed_at)
  const streak = computeStreak((pastWorkoutsRes.data ?? []) as Array<{ completed_at: string | null; status: string }>);

  const bwHistory = (bwRes.data ?? []) as { weight_kg: number; logged_at: string }[];
  const latestBw = bwHistory[0] ?? null;
  const prevBw = bwHistory[1] ?? null;
  const bwDelta = latestBw && prevBw ? +(latestBw.weight_kg - prevBw.weight_kg).toFixed(1) : null;

  const waistHistory = (waistRes.data ?? []) as { waist_cm: number; logged_at: string }[];
  const latestWaist = waistHistory[0] ?? null;
  const prevWaist = waistHistory[1] ?? null;
  const waistDelta = latestWaist && prevWaist ? +(latestWaist.waist_cm - prevWaist.waist_cm).toFixed(1) : null;

  // Filter upcoming workouts to active week only from combined query
  const upcomingWorkouts = allScheduled.filter(
    (w: any) => w.status !== "completed" && w.program_days?.program_weeks?.is_active === true
  );

  // Active program info
  const activeProg = activeProgRes.data;
  const programTitle = activeProg?.title ?? null;
  const activeWeek = (activeProg?.program_weeks as any[] | undefined)?.find((w: any) => w.is_active) ?? null;
  const weekLabel = activeWeek ? `Jakso ${activeWeek.week_number}` : null;
  const weekDescription: string | null = activeWeek?.description ?? null;

  return (
    <div>
      {/* Header */}
      <div className="card-enter flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/clients"
            className="icon-nudge-l flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              Liittynyt {new Date(profile.created_at).toLocaleDateString("fi-FI")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/coach/messages${threadRes.data ? `?thread=${threadRes.data.id}` : `?with=${profile.id}`}`}
            className="icon-shake flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:bg-accent"
          >
            <MessageSquare className="h-4 w-4" />
            Viesti
          </Link>
          <OhjelmoiButton
            clientId={profile.id}
            clientName={name}
            existingProgramId={activeProg?.id}
          />
        </div>
      </div>

      <div className="space-y-5 p-4 md:p-6">
        {/* Stat boxes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-enter card-enter-1 rounded-2xl border bg-card p-4 hover:scale-[1.04] hover:shadow-md" style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Noudatus</span>
              <Check className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {adherencePct !== null ? `${adherencePct}%` : "—"}
            </p>
          </div>
          <div className="card-enter card-enter-2 rounded-2xl border bg-card p-4 hover:scale-[1.04] hover:shadow-md" style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Treeniputki</span>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {streak > 0 ? `${streak} pv` : "—"}
            </p>
          </div>
          <div className="card-enter card-enter-3 rounded-2xl border bg-card p-4 hover:scale-[1.04] hover:shadow-md" style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ohjelma</span>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="truncate text-base font-bold text-violet-400">
              {programTitle ?? "—"}
            </p>
          </div>
        </div>

        {/* Phase badge */}
        {weekLabel && (
          <div className="card-enter card-enter-4">
            <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {weekLabel}
            </span>
          </div>
        )}

        {/* Measurement charts */}
        {(bwHistory.length > 0 || waistHistory.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
        {/* Bodyweight card */}
        {bwHistory.length > 0 && (
          <div className="card-enter card-enter-5 rounded-2xl border bg-card overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Kehonpaino</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{latestBw!.weight_kg} kg</span>
                {bwDelta !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${
                    bwDelta > 0 ? "text-emerald-500" : bwDelta < 0 ? "text-rose-400" : "text-muted-foreground"
                  }`}>
                    {bwDelta > 0
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : bwDelta < 0
                      ? <TrendingDown className="h-3.5 w-3.5" />
                      : <Minus className="h-3.5 w-3.5" />}
                    {bwDelta > 0 ? "+" : ""}{bwDelta} kg
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 pt-3 pb-1">
              <MeasurementChart
                data={bwHistory.map((e) => ({ value: e.weight_kg, logged_at: e.logged_at }))}
                unit="kg"
                color="#818cf8"
                emptyText=""
                height={110}
              />
            </div>
            <div className="divide-y max-h-52 overflow-y-auto">
              {bwHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.logged_at).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
                  </span>
                  <span className={`text-sm font-semibold ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {entry.weight_kg} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waist card */}
        {waistHistory.length > 0 && (
          <div className="card-enter card-enter-6 rounded-2xl border bg-card overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Vyötärö</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{latestWaist!.waist_cm} cm</span>
                {waistDelta !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${
                    waistDelta > 0 ? "text-rose-400" : waistDelta < 0 ? "text-emerald-500" : "text-muted-foreground"
                  }`}>
                    {waistDelta > 0
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : waistDelta < 0
                      ? <TrendingDown className="h-3.5 w-3.5" />
                      : <Minus className="h-3.5 w-3.5" />}
                    {waistDelta > 0 ? "+" : ""}{waistDelta} cm
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 pt-3 pb-1">
              <MeasurementChart
                data={waistHistory.map((e) => ({ value: e.waist_cm, logged_at: e.logged_at }))}
                unit="cm"
                color="#34d399"
                emptyText=""
                height={110}
              />
            </div>
            <div className="divide-y max-h-52 overflow-y-auto">
              {waistHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.logged_at).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
                  </span>
                  <span className={`text-sm font-semibold ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {entry.waist_cm} cm
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
        )}

        <ClientTrainingView
          upcomingWorkouts={upcomingWorkouts}
          pastWorkouts={pastWorkoutsRes.data ?? []}
          weekDescription={weekDescription}
          ohjelmoiHref={activeProg?.id ? `/coach/client-programs/${activeProg.id}/edit` : null}
        />

        <div className="card-enter card-enter-7">
          <RecordsSection clientId={id} exercises={exercises} />
        </div>

        <div className="card-enter rounded-2xl border bg-card p-4">
          <KilpailutyokaluCard bigThreeE1rm={bigThreeE1rm} />
        </div>
      </div>
    </div>
  );
}


function computeStreak(workouts: Array<{ completed_at: string | null; status: string }>): number {
  const completedDates = new Set(
    workouts
      .filter((w) => w.status === "completed" && w.completed_at)
      .map((w) => w.completed_at!.slice(0, 10))
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    if (completedDates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // Today may not have workout yet — skip and check yesterday
      continue;
    } else {
      break;
    }
  }

  return streak;
}
