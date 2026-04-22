import type React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, avatarColor } from "@/lib/utils";
import { OhjelmoiButton } from "@/components/program-builder/ohjelmoi-button";
import { ClientTrainingView } from "@/components/client-detail/client-training-view";
import { PersonalRecordsSection, EstimatedBestSection } from "@/components/client-detail/pr-sections";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const currentWeekStart = getWeekStart(new Date());

  const [profileRes, upcomingRes, threadRes, programsRes, pastWorkoutsRes, exercisesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", id).single(),
    supabase
      .from("scheduled_workouts")
      .select("id, scheduled_date, status, program_days(name)")
      .eq("client_id", id)
      .neq("status", "completed")
      .gte("scheduled_date", currentWeekStart)
      .order("scheduled_date")
      .limit(21),
    supabase.from("threads").select("id").eq("client_id", id).maybeSingle(),
    supabase
      .from("programs")
      .select("id, title, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("scheduled_workouts")
      .select(`
        id, scheduled_date, status,
        program_days (name, day_number),
        workout_logs (
          logged_at,
          set_logs (
            weight, reps,
            exercises (name)
          )
        )
      `)
      .eq("client_id", id)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false })
      .limit(50),
    supabase
      .from("exercises")
      .select("id, name")
      .order("name"),
  ]);

  if (profileRes.error || !profileRes.data) notFound();
  const profile = profileRes.data;
  const exercises = (exercisesRes.data ?? []).map((e: any) => ({ id: e.id, name: e.name }));

  const name: string = profile.full_name ?? "Unnamed";
  const initials = name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
  const gradient = avatarColor(name);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Hero card */}
      <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-280 hover:scale-[1.015] active:scale-[0.99]"
        style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}>
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgba(251,207,232,0.05) 100%)",
            transition: "opacity 280ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
        <div className="relative flex flex-wrap items-start gap-4 sm:flex-nowrap sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}>
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
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
              existingProgramId={programsRes.data?.[0]?.id}
            />
          </div>
        </div>
      </div>

      <ClientTrainingView
        upcomingWorkouts={upcomingRes.data ?? []}
        pastWorkouts={pastWorkoutsRes.data ?? []}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PersonalRecordsSection clientId={id} exercises={exercises} />
        <EstimatedBestSection clientId={id} exercises={exercises} />
      </div>
    </div>
  );
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
