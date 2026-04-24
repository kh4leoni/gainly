"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";
import { derivedRepMax, roundKg } from "@/lib/calc/one-rm";

type Props = {
  clientId: string;
  exercises: Array<{ id: string; name: string }>;
};

function RecordCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="group relative rounded-2xl border bg-card transition-all duration-280 hover:shadow-md active:scale-[0.995]"
      style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
        style={{
          background: "linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgba(251,207,232,0.05) 100%)",
          transition: "opacity 280ms cubic-bezier(0.34,1.56,0.64,1)",
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
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Valitse harjoitus…</option>
        {exercises.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </svg>
      </span>
    </div>
  );
}

type BestRow = {
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
  rpe: number | null;
};

export function RecordsSection({ clientId, exercises }: Props) {
  const [exerciseId, setExerciseId] = useState("");
  const [repRange, setRepRange] = useState(1);
  const [row, setRow] = useState<BestRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exerciseId) { setRow(null); return; }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("personal_records")
      .select("weight, reps, estimated_1rm, achieved_at, set_logs ( rpe )")
      .eq("client_id", clientId)
      .eq("exercise_id", exerciseId)
      .eq("rep_range", "1RM")
      .maybeSingle()
      .then(({ data }) => {
        if (!data || data.weight == null || data.reps == null || data.estimated_1rm == null) {
          setRow(null); setLoading(false); return;
        }
        const d = data as any;
        setRow({
          weight: d.weight,
          reps: d.reps,
          estimated_1rm: d.estimated_1rm,
          achieved_at: d.achieved_at,
          rpe: d.set_logs?.rpe ?? null,
        });
        setLoading(false);
      });
  }, [clientId, exerciseId, repRange]);

  const derived = row ? derivedRepMax(row.estimated_1rm, repRange) : null;

  return (
    <RecordCard title="Ennätykset">
      <div className="flex gap-2">
        <ExerciseSelect exercises={exercises} value={exerciseId} onChange={setExerciseId} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRepRange((p) => Math.max(1, p - 1))}
              className="flex h-9 w-8 items-center justify-center rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-muted"
            >
              −
            </button>
            <span className="w-8 text-center text-base font-semibold tabular-nums">{repRange}</span>
            <button
              type="button"
              onClick={() => setRepRange((p) => Math.min(5, p + 1))}
              className="flex h-9 w-8 items-center justify-center rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-muted"
            >
              +
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground">rep</span>
        </div>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-md bg-muted" />
      ) : row && derived != null ? (
        <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {roundKg(derived)}{" "}
                <span className="text-base font-normal text-muted-foreground">kg</span>
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  × {repRange}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {relativeTime(row.achieved_at)}
                <span className="ml-2">
                  ({row.weight}kg × {row.reps}{row.rpe != null ? ` @RPE ${row.rpe}` : ""})
                </span>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
              {repRange}RM
            </span>
          </div>
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Arvioitu 1RM</span>
              <span className="text-sm font-bold tabular-nums text-primary">
                {roundKg(row.estimated_1rm)} kg
              </span>
            </div>
          </div>
        </div>
      ) : exerciseId ? (
        <p className="text-sm text-muted-foreground">Ei ennätystä tälle harjoitukselle.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Valitse harjoitus nähdäksesi ennätyksen.</p>
      )}
    </RecordCard>
  );
}
