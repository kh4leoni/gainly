"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getTodayWorkout, getRecentPRs, getUpcomingWorkouts } from "@/lib/queries/workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/utils";
import { usePrToast } from "@/hooks/use-pr-toast";

export function ClientDashboardView({ clientId }: { clientId: string }) {
  const supabase = createClient();

  usePrToast(clientId);

  const today = useQuery({
    queryKey: ["today", clientId],
    queryFn: () => getTodayWorkout(supabase, clientId),
    enabled: !!clientId,
  });
  const prs = useQuery({
    queryKey: ["prs", clientId],
    queryFn: () => getRecentPRs(supabase, clientId),
    enabled: !!clientId,
  });
  const upcoming = useQuery({
    queryKey: ["upcoming", clientId],
    queryFn: () => getUpcomingWorkouts(supabase, clientId),
    enabled: !!clientId,
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tänään</CardTitle>
        </CardHeader>
        <CardContent>
          {today.data ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {today.data.program_days?.name ?? "Workout"}
                </p>
                <Badge variant={today.data.status === "completed" ? "success" : "secondary"}>
                  {today.data.status === "completed" ? "Valmis" : today.data.status === "pending" ? "Odottaa" : today.data.status}
                </Badge>
              </div>
              <Button asChild>
                <Link href={`/client/workout/${today.data.id}`} prefetch>
                  {today.data.status === "completed" ? "Tarkastele" : "Aloita treeni"}
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Treeniä ei ole suunniteltu tälle päivälle. Nauti levosta.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Viimeisimmät ennätykset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(prs.data ?? []).map((pr: any) => (
              <div key={pr.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm">
                  {pr.exercises?.name} — {pr.weight}kg × {pr.reps} <Badge variant="outline" className="ml-1">{pr.rep_range}</Badge>
                </span>
                <span className="text-xs text-muted-foreground">{relativeTime(pr.achieved_at)}</span>
              </div>
            ))}
            {prs.data?.length === 0 && <p className="text-sm text-muted-foreground">Ei vielä. Mene asettamaan.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tulevat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(upcoming.data ?? []).slice(0, 7).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm">
                  {new Date(w.scheduled_date).toLocaleDateString("fi-FI")} — {w.program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni"}
                </span>
                <Badge variant={w.status === "completed" ? "success" : "secondary"}>{w.status === "completed" ? "Valmis" : w.status === "pending" ? "Odottaa" : w.status}</Badge>
              </div>
            ))}
            {upcoming.data?.length === 0 && <p className="text-sm text-muted-foreground">Ei suunnitelmia.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
