import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Parallel: one nested select for the client's sidebar data.
  const [profileRes, upcomingRes, prsRes, threadRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", id).single(),
    supabase
      .from("scheduled_workouts")
      .select("id, scheduled_date, status, program_days(name)")
      .eq("client_id", id)
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("scheduled_date")
      .limit(7),
    supabase
      .from("personal_records")
      .select("id, rep_range, weight, reps, estimated_1rm, achieved_at, exercises(name)")
      .eq("client_id", id)
      .order("achieved_at", { ascending: false })
      .limit(5),
    supabase.from("threads").select("id").eq("client_id", id).maybeSingle(),
  ]);

  if (profileRes.error || !profileRes.data) notFound();
  const profile = profileRes.data;

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
          <Link
            href={`/coach/programs?assignTo=${profile.id}`}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Määritä ohjelma
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tulevat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(upcomingRes.data ?? []).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm">
                  {new Date(w.scheduled_date).toLocaleDateString("fi-FI")} — {w.program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni"}
                </span>
                <Badge variant={w.status === "completed" ? "success" : "secondary"}>{w.status === "completed" ? "Valmis" : w.status === "pending" ? "Odottaa" : w.status}</Badge>
              </div>
            ))}
            {upcomingRes.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Ei suunnitelmia.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Viimeisimmät ennätykset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(prsRes.data ?? []).map((pr: any) => (
              <div key={pr.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm">
                  {pr.exercises?.name} — {pr.weight}kg × {pr.reps}
                </span>
                <span className="text-xs text-muted-foreground">{relativeTime(pr.achieved_at)}</span>
              </div>
            ))}
            {prsRes.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Ei ennätyksiä vielä.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
