"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getOneRmCurve, getRecentPRs } from "@/lib/queries/workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";

// Lazy-load Recharts — keeps the initial bundle slim.
const Chart = dynamic(() => import("./one-rm-chart").then((m) => m.OneRmChart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-muted" />,
});

export function ProgressView({
  clientId,
  exercises,
}: {
  clientId: string;
  exercises: Array<{ id: string; name: string }>;
}) {
  const supabase = createClient();
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");

  const curve = useQuery({
    queryKey: ["curve", clientId, exerciseId],
    enabled: !!exerciseId,
    queryFn: () => getOneRmCurve(supabase, clientId, exerciseId, 180),
  });

  const prs = useQuery({
    queryKey: ["prs", clientId, "all"],
    queryFn: () => getRecentPRs(supabase, clientId, 20),
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Arvioitu 1RM</CardTitle>
          <Select value={exerciseId} onValueChange={setExerciseId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Valitse harjoitus" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {exerciseId ? <Chart data={curve.data ?? []} /> : <p className="text-muted-foreground">Ei vielä tietoja.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PR-aikajana</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(prs.data ?? []).map((pr: any) => (
            <div key={pr.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
              <span>{pr.exercises?.name} — {pr.weight}kg × {pr.reps} <Badge variant="outline" className="ml-1">{pr.rep_range}</Badge></span>
              <span className="text-xs text-muted-foreground">{relativeTime(pr.achieved_at)}</span>
            </div>
          ))}
          {prs.data?.length === 0 && <p className="text-sm text-muted-foreground">Ei PR:ää vielä.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
