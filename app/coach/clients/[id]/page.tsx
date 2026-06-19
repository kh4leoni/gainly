import type React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { avatarColor, nameInitials } from "@/lib/utils";
import { OhjelmoiButton } from "@/components/program-builder/ohjelmoi-button";
import { ClientTrainingView } from "@/components/client-detail/client-training-view";
import { ClientProgramsCard } from "@/components/client-detail/client-programs-card";
import { ClientMealPlanCard } from "@/components/client-detail/meal-plan-card";
import { getClientMealPlanId, listTemplateMealPlans } from "@/lib/queries/meals";
import { RecordsSection } from "@/components/client-detail/pr-sections";
import { MeasurementChart } from "@/components/client/measurement-chart";
import { KilpailutyokaluCard } from "@/components/client/kilpailutyokalu-card";
import { bigThreeE1rmFromSelection } from "@/lib/powerlifting";
import { setCompLift } from "@/app/coach/clients/actions";
import { MessageSquare, ChevronLeft, Check, Zap, LayoutGrid, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Single scheduled_workouts query replaces two (upcoming + adherence)
  const [profileRes, allScheduledRes, threadRes, activeProgRes, pastWorkoutsRes, prExercisesRes, bwRes, waistRes, mealPlanId, me, compRes] = await Promise.all([
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
      .order("created_at", { ascending: false }),
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
    getClientMealPlanId(supabase, id),
    getCachedUser(),
    supabase.from("coach_clients")
      .select("comp_squat_exercise_id, comp_bench_exercise_id, comp_dead_exercise_id")
      .eq("client_id", id).maybeSingle(),
  ]);

  const mealTemplates = me ? await listTemplateMealPlans(supabase, me.id) : [];

  if (profileRes.error || !profileRes.data) notFound();
  const profile = profileRes.data;

  // Deduplicate exercises from PRs
  const exerciseMap = new Map<string, { id: string; name: string }>();
  for (const row of prExercisesRes.data ?? []) {
    const ex = (row as any).exercises;
    if (ex && !exerciseMap.has(ex.id)) exerciseMap.set(ex.id, { id: ex.id, name: ex.name });
  }
  const exercises = Array.from(exerciseMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Top e1RM per exercise, then map the coach's per-lift picks onto it.
  const topE1rmByExercise = new Map<string, number>();
  for (const row of prExercisesRes.data ?? []) {
    const ex = (row as any).exercises;
    const e1rm = (row as any).estimated_1rm as number | null;
    if (!ex || e1rm == null) continue;
    if (e1rm > (topE1rmByExercise.get(ex.id) ?? 0)) topE1rmByExercise.set(ex.id, e1rm);
  }
  const compSelection = {
    squat: compRes.data?.comp_squat_exercise_id ?? null,
    bench: compRes.data?.comp_bench_exercise_id ?? null,
    dead: compRes.data?.comp_dead_exercise_id ?? null,
  };
  const bigThreeE1rm = bigThreeE1rmFromSelection(compSelection, topE1rmByExercise);
  const compOptions = exercises.filter((e) => topE1rmByExercise.has(e.id));

  const name: string = profile.full_name ?? "Unnamed";
  const initials = nameInitials(name);
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
  const bwSeries = bwHistory.map((e) => ({ value: e.weight_kg, logged_at: e.logged_at }));
  const bw7 = deltaOverDays(bwSeries, 7);
  const bw30 = deltaOverDays(bwSeries, 30);

  const waistHistory = (waistRes.data ?? []) as { waist_cm: number; logged_at: string }[];
  const latestWaist = waistHistory[0] ?? null;
  const waistSeries = waistHistory.map((e) => ({ value: e.waist_cm, logged_at: e.logged_at }));
  const waist7 = deltaOverDays(waistSeries, 7);
  const waist30 = deltaOverDays(waistSeries, 30);

  // Filter upcoming workouts to active week only from combined query
  const upcomingWorkouts = allScheduled.filter(
    (w: any) => w.status !== "completed" && w.program_days?.program_weeks?.is_active === true
  );

  // Client programs — a client can have several (custom-built and assigned templates).
  const programRows = (activeProgRes.data ?? []) as any[];
  const programs = programRows.map((p) => ({ id: p.id as string, title: p.title as string }));
  // Active week = the is_active week across any of the client's programs.
  let activeWeek: any = null;
  let activeWeekProgram: any = null;
  for (const prog of programRows) {
    const w = (prog.program_weeks as any[] | undefined)?.find((x: any) => x.is_active);
    if (w) { activeWeek = w; activeWeekProgram = prog; break; }
  }
  const programTitle =
    programRows.length === 0 ? null
    : programRows.length === 1 ? programRows[0].title
    : `${programRows.length} ohjelmaa`;
  const trainingProgId: string | null = activeWeekProgram?.id ?? programRows[0]?.id ?? null;
  const weekLabel = activeWeek ? `Jakso ${activeWeek.week_number}` : null;
  const weekDescription: string | null = activeWeek?.description ?? null;

  return (
    <div>
      {/* Header */}
      <div className="card-enter flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/clients"
            aria-label="Takaisin asiakaslistaan"
            className="icon-nudge-l flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div
            aria-hidden
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}
          >
            {initials}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              Liittynyt {new Date(profile.created_at).toLocaleDateString("fi-FI")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/coach/messages${threadRes.data ? `?thread=${threadRes.data.id}` : `?with=${profile.id}`}`}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <MessageSquare className="h-4 w-4" />
            Viesti
          </Link>
          <OhjelmoiButton
            clientId={profile.id}
            programs={programs}
          />
        </div>
      </div>

      <div className="space-y-5 p-4 md:p-6">
        {/* Stat boxes */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card-enter card-enter-1 rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Noudatus</span>
              <Check className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {adherencePct !== null ? `${adherencePct}%` : "—"}
            </p>
          </div>
          <div className="card-enter card-enter-2 rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Treeniputki</span>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {streak > 0 ? `${streak} pv` : "—"}
            </p>
          </div>
          <div className="card-enter card-enter-3 col-span-2 rounded-2xl border bg-card p-4 sm:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ohjelma</span>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="truncate text-base font-bold text-coach-violet">
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Bodyweight card */}
        {bwHistory.length > 0 && (
          <div className="card-enter card-enter-5 rounded-2xl border bg-card overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Kehonpaino</span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-2xl font-bold text-primary">{latestBw!.weight_kg} kg</span>
                {(bw7 !== null || bw30 !== null) && (
                  <div className="flex items-center gap-1.5">
                    <DeltaChip label="7 pv" delta={bw7} unit="kg" goodDown={false} />
                    <DeltaChip label="30 pv" delta={bw30} unit="kg" goodDown={false} />
                  </div>
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
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-2xl font-bold text-primary">{latestWaist!.waist_cm} cm</span>
                {(waist7 !== null || waist30 !== null) && (
                  <div className="flex items-center gap-1.5">
                    <DeltaChip label="7 pv" delta={waist7} unit="cm" goodDown={true} />
                    <DeltaChip label="30 pv" delta={waist30} unit="cm" goodDown={true} />
                  </div>
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

        <ClientProgramsCard clientId={profile.id} programs={programs} />

        <ClientTrainingView
          upcomingWorkouts={upcomingWorkouts}
          pastWorkouts={pastWorkoutsRes.data ?? []}
          weekDescription={weekDescription}
          ohjelmoiHref={trainingProgId ? `/coach/client-programs/${trainingProgId}/edit` : null}
        />

        <ClientMealPlanCard clientId={profile.id} clientName={name} planId={mealPlanId} templates={mealTemplates} />

        <div className="card-enter card-enter-7">
          <RecordsSection clientId={id} exercises={exercises} />
        </div>

        <div className="card-enter rounded-2xl border bg-card p-4">
          <KilpailutyokaluCard
            bigThreeE1rm={bigThreeE1rm}
            selection={compSelection}
            options={compOptions}
            onSelect={setCompLift.bind(null, id)}
          />
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

// Delta of latest value vs the most recent entry at least `days` old.
// History is descending (latest first). Falls back to oldest entry when
// none is old enough, so a partial window still shows available change.
function deltaOverDays(history: { value: number; logged_at: string }[], days: number): number | null {
  const latest = history[0];
  if (!latest || history.length < 2) return null;
  const cutoff = Date.now() - days * 86_400_000;
  let ref: { value: number; logged_at: string } | null = null;
  for (let i = 1; i < history.length; i++) {
    const e = history[i]!;
    if (new Date(e.logged_at).getTime() <= cutoff) {
      ref = e;
      break;
    }
  }
  if (!ref) ref = history[history.length - 1]!;
  if (ref === latest) return null;
  return +(latest.value - ref.value).toFixed(1);
}

function DeltaChip({
  label,
  delta,
  unit,
  goodDown,
}: {
  label: string;
  delta: number | null;
  unit: string;
  goodDown: boolean;
}) {
  if (delta === null) return null;
  const positive = delta > 0;
  const negative = delta < 0;
  const good = goodDown ? negative : positive;
  const bad = goodDown ? positive : negative;
  const color = good ? "text-coach-ok" : bad ? "text-coach-danger" : "text-muted-foreground";
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  return (
    <span className={`flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-semibold ${color}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {delta} {unit}
    </span>
  );
}
