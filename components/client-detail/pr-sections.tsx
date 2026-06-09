"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";
import { derivedRepMax, roundKg } from "@/lib/calc/one-rm";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Props = {
  clientId: string;
  exercises: Array<{ id: string; name: string }>;
};

type PRRow = {
  reps: number;
  weight: number | null;
  estimated_1rm: number | null;
  achieved_at: string;
};

function RecordCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-grow group relative rounded-2xl border bg-card">
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, hsl(var(--primary)) 10%, transparent) 0%, color-mix(in srgb, hsl(var(--primary)) 4%, transparent) 100%)",
        }}
      />
      <div className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">{children}</CardContent>
      </div>
    </div>
  );
}

function ExerciseSelect({
  exercises,
  value,
  onChange,
}: {
  exercises: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <SearchableSelect
      className="flex-1"
      options={exercises.map((e) => ({ value: e.id, label: e.name }))}
      value={value}
      onChange={onChange}
      placeholder="Valitse harjoitus…"
    />
  );
}

export function RecordsSection({ clientId, exercises }: Props) {
  const [exerciseId, setExerciseId] = useState("");
  const [rows, setRows] = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exerciseId) { setRows([]); return; }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("personal_records")
      .select("reps, weight, estimated_1rm, achieved_at")
      .eq("client_id", clientId)
      .eq("exercise_id", exerciseId)
      .order("reps", { ascending: true })
      .then(({ data }) => {
        setRows((data ?? []) as PRRow[]);
        setLoading(false);
      });
  }, [clientId, exerciseId]);

  const topE1rm = rows.reduce<number | null>((max, r) => {
    if (r.estimated_1rm == null) return max;
    return max == null || r.estimated_1rm > max ? r.estimated_1rm : max;
  }, null);
  const latestAchieved = rows.reduce<string | null>((best, r) => {
    if (!best) return r.achieved_at;
    return r.achieved_at > best ? r.achieved_at : best;
  }, null);

  return (
    <RecordCard title="Ennätykset">
      <ExerciseSelect exercises={exercises} value={exerciseId} onChange={setExerciseId} />

      {loading ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      ) : exerciseId ? (
        rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ei ennätystä tälle harjoitukselle.</p>
        ) : (
          <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reps</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ennätys</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Arvio @RPE 10</span>
            </div>
            {[1, 2, 3, 4, 5].map((n) => {
              const row = rows.find((r) => r.reps === n) ?? null;
              const derived = topE1rm != null ? derivedRepMax(topE1rm, n, 10) : null;
              return (
                <div key={n} className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="w-10 font-bold tabular-nums">{n}</span>
                  <span className="flex-1 text-center tabular-nums">
                    {row?.weight != null ? `${roundKg(row.weight)} kg` : "—"}
                  </span>
                  <span className="flex-1 text-right font-semibold text-primary tabular-nums">
                    {derived != null ? `${roundKg(derived)} kg` : "—"}
                  </span>
                </div>
              );
            })}
            {topE1rm != null && (
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Paras e1RM{latestAchieved ? ` · ${relativeTime(latestAchieved)}` : ""}</span>
                <span className="text-sm font-bold tabular-nums text-primary">
                  {roundKg(topE1rm)} kg
                </span>
              </div>
            )}
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">Valitse harjoitus nähdäksesi ennätyksen.</p>
      )}
    </RecordCard>
  );
}
