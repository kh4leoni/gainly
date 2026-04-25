import type React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avatarColor } from "@/lib/utils";
import { OhjelmoiButton } from "@/components/program-builder/ohjelmoi-button";
import { ClientTrainingView } from "@/components/client-detail/client-training-view";
import { RecordsSection } from "@/components/client-detail/pr-sections";
import { MessageSquare, ChevronLeft, Check, Zap, LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileRes, upcomingRes, threadRes, activeProgRes, pastWorkoutsRes, exercisesRes, adherenceRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", id).single(),
    supabase
      .from("scheduled_workouts")
      .select(`
        id, status,
        program_days(
          name, description, day_number,
          program_weeks(is_active),
          program_exercises(order_idx, exercises(name))
        )
      `)
      .eq("client_id", id)
      .neq("status", "completed"),
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
    supabase.from("exercises").select("id, name").order("name"),
    supabase
      .from("scheduled_workouts")
      .select("status, program_days(program_weeks(is_active))")
      .eq("client_id", id),
  ]);

  if (profileRes.error || !profileRes.data) notFound();
  const profile = profileRes.data;
  const exercises = (exercisesRes.data ?? []).map((e: any) => ({ id: e.id, name: e.name }));

  const name: string = profile.full_name ?? "Unnamed";
  const initials = name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
  const gradient = avatarColor(name);

  // Compute adherence % for active week
  const adherenceData = (adherenceRes.data ?? []).filter(
    (w: any) => w.program_days?.program_weeks?.is_active === true
  );
  const adherenceTotal = adherenceData.length;
  const adherenceCompleted = adherenceData.filter((w: any) => w.status === "completed").length;
  const adherencePct = adherenceTotal > 0 ? Math.round((adherenceCompleted / adherenceTotal) * 100) : null;

  // Compute streak (consecutive days with completed workout, using completed_at)
  const streak = computeStreak((pastWorkoutsRes.data ?? []) as Array<{ completed_at: string | null; status: string }>);

  // Filter upcoming workouts to active week only
  const upcomingWorkouts = (upcomingRes.data ?? []).filter(
    (w: any) => w.program_days?.program_weeks?.is_active === true
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/clients"
            className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted"
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
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:bg-accent"
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
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Noudatus</span>
              <Check className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {adherencePct !== null ? `${adherencePct}%` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Treeniputki</span>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {streak > 0 ? `${streak} pv` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
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
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {weekLabel}
            </span>
          </div>
        )}

        <ClientTrainingView
          upcomingWorkouts={upcomingWorkouts}
          pastWorkouts={pastWorkoutsRes.data ?? []}
          weekDescription={weekDescription}
        />

        <RecordsSection clientId={id} exercises={exercises} />
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
