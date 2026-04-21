import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import { OhjelmoiButton } from "@/components/program-builder/ohjelmoi-button";
import { ClientTrainingView } from "@/components/client-detail/client-training-view";
import { PersonalRecordsSection, EstimatedBestSection } from "@/components/client-detail/pr-sections";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const currentWeekStart = getWeekStart(new Date());

  const [profileRes, upcomingRes, threadRes, programsRes, pastWorkoutsRes, exercisesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", id).single(),
    supabase
      .from("scheduled_workouts")
      .select("id, scheduled_date, status, program_days(name)")
      .eq("client_id", id)
      .gte("scheduled_date", today)
      .order("scheduled_date")
      .limit(7),
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{profile.full_name ?? "Unnamed"}</h1>
          <p className="text-sm text-muted-foreground">
            Liittynyt {new Date(profile.created_at).toLocaleDateString("fi-FI")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/coach/messages${threadRes.data ? `?thread=${threadRes.data.id}` : `?with=${profile.id}`}`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Viesti
          </Link>
          <OhjelmoiButton
            clientId={profile.id}
            clientName={profile.full_name ?? "Unnamed"}
            existingProgramId={programsRes.data?.[0]?.id}
          />
        </div>
      </div>

      <ClientTrainingView
        upcomingWorkouts={upcomingRes.data ?? []}
        pastWorkouts={pastWorkoutsRes.data ?? []}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
