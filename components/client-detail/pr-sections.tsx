"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";

const REP_RANGES = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

type PRRecord = {
  id: string;
  rep_range: string;
  weight: number | null;
  reps: number | null;
  estimated_1rm: number | null;
  achieved_at: string;
  exercises: { name: string } | { name: string }[] | null;
};

type Props = {
  clientId: string;
  exercises: Array<{ id: string; name: string }>;
};

// RPE-based e1RM: weight × (1 + reps / (10 - RPE))
function rpeEstimated1rm(weight: number, reps: number, rpe: number): number {
  if (rpe >= 10) return weight;
  return weight * (1 + reps / (10 - rpe));
}

export function PersonalRecordsSection({ clientId, exercises }: Props) {
  const [exerciseId, setExerciseId] = useState<string>("");
  const [repRange, setRepRange] = useState<string>("1");
  const [pr, setPr] = useState<PRRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exerciseId) {
      setPr(null);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("personal_records")
      .select("id, rep_range, weight, reps, estimated_1rm, achieved_at, exercises(name)")
      .eq("client_id", clientId)
      .eq("exercise_id", exerciseId)
      .eq("rep_range", `${repRange}RM`)
      .single()
      .then(({ data }) => {
        setPr(data as PRRecord | null);
        setLoading(false);
      });
  }, [clientId, exerciseId, repRange]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ennätykset</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={exerciseId} onValueChange={setExerciseId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Valitse harjoitus" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={repRange} onValueChange={setRepRange}>
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REP_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label} rep</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        ) : pr ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
            <div>
              <div className="text-lg font-semibold">{pr.weight ?? 0}kg × {pr.reps ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                Epley {pr.estimated_1rm?.toFixed(1) ?? "—"}kg · {relativeTime(pr.achieved_at)}
              </div>
            </div>
            <Badge variant="outline">PR</Badge>
          </div>
        ) : exerciseId ? (
          <p className="text-sm text-muted-foreground">Ei ennätystä tälle harjoitukselle.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Valitse harjoitus nähdäksesi ennätyksen.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function EstimatedBestSection({ clientId, exercises }: Props) {
  const [exerciseId, setExerciseId] = useState<string>("");
  const [repRange, setRepRange] = useState<string>("1");
  const [best, setBest] = useState<{
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    estimated_1rm: number | null;
    achieved_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const repCount = parseInt(repRange, 10);

  useEffect(() => {
    if (!exerciseId) {
      setBest(null);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("set_logs")
      .select(`
        weight, reps, rpe, estimated_1rm,
        workout_logs (logged_at)
      `)
      .eq("workout_logs.client_id", clientId)
      .eq("exercise_id", exerciseId)
      .not("weight", "is", null)
      .not("reps", "is", null)
      .not("rpe", "is", null)
      .gte("reps", repCount - 1)
      .lte("reps", repCount + 1)
      .order("estimated_1rm", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const withE1rm = (data as any[]).map((row: any) => ({
            weight: row.weight,
            reps: row.reps,
            rpe: row.rpe,
            estimated_1rm: row.estimated_1rm,
            achieved_at: row.workout_logs?.logged_at,
            rpeE1rm: row.rpe ? rpeEstimated1rm(row.weight, row.reps, row.rpe) : row.estimated_1rm,
          }));
          withE1rm.sort((a, b) => (b.rpeE1rm ?? 0) - (a.rpeE1rm ?? 0));
          const top = withE1rm[0];
          if (!top) { setBest(null); setLoading(false); return; }
          setBest({
            weight: top.weight,
            reps: top.reps,
            rpe: top.rpe,
            estimated_1rm: top.rpeE1rm,
            achieved_at: top.achieved_at,
          });
        } else {
          setBest(null);
        }
        setLoading(false);
      });
  }, [clientId, exerciseId, repRange, repCount]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Arvioitu maksimi (RPE)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={exerciseId} onValueChange={setExerciseId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Valitse harjoitus" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={repRange} onValueChange={setRepRange}>
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REP_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label} rep</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        ) : best ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
            <div>
              <div className="text-lg font-semibold">{best.weight ?? 0}kg × {best.reps ?? 0} @ RPE {best.rpe ?? "-"}</div>
              <div className="text-xs text-muted-foreground">
                RPE-arvioitu 1RM: {best.estimated_1rm?.toFixed(1) ?? "—"}kg · {relativeTime(best.achieved_at)}
              </div>
            </div>
            <Badge variant="secondary">e1RM</Badge>
          </div>
        ) : exerciseId ? (
          <p className="text-sm text-muted-foreground">Ei tarvittavia tietoja (tarvitaan RPE-arvo).</p>
        ) : (
          <p className="text-sm text-muted-foreground">Valitse harjoitus nähdäksesi arvioidun maksimin.</p>
        )}
      </CardContent>
    </Card>
  );
}
