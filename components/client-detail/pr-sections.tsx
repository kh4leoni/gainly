"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";

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

function rpeEstimated1rm(weight: number, reps: number, rpe: number): number {
  if (rpe >= 10) return weight;
  return weight * (1 + reps / (10 - rpe));
}

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

function ExerciseSearchInput({
  exercises,
  value,
  onChange,
}: {
  exercises: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedName = exercises.find((e) => e.id === value)?.name ?? "";
  const displayValue = open ? query : selectedName;

  const filtered = query.trim()
    ? exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-1">
      <input
        className="h-9 w-full rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Valitse harjoitus…"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute bottom-full left-0 z-50 mb-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(e.id);
              }}
            >
              {e.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
    <RecordCard title="Ennätykset">
      <div className="flex gap-2">
        <ExerciseSearchInput exercises={exercises} value={exerciseId} onChange={setExerciseId} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRepRange((p) => String(Math.max(1, parseInt(p) - 1)))}
              className="flex h-9 w-8 items-center justify-center rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-muted"
            >
              −
            </button>
            <span className="w-8 text-center text-base font-semibold tabular-nums">{repRange}</span>
            <button
              type="button"
              onClick={() => setRepRange((p) => String(Math.min(5, parseInt(p) + 1)))}
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
      ) : pr ? (
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {pr.weight ?? 0}{" "}
              <span className="text-base font-normal text-muted-foreground">kg</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Epley {pr.estimated_1rm?.toFixed(1) ?? "—"}kg · {relativeTime(pr.achieved_at)}
            </div>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
            PR
          </span>
        </div>
      ) : exerciseId ? (
        <p className="text-sm text-muted-foreground">Ei ennätystä tälle harjoitukselle.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Valitse harjoitus nähdäksesi ennätyksen.</p>
      )}
    </RecordCard>
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
      .select(`weight, reps, rpe, estimated_1rm, workout_logs (logged_at)`)
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
            rpeE1rm: row.rpe
              ? rpeEstimated1rm(row.weight, row.reps, row.rpe)
              : row.estimated_1rm,
          }));
          withE1rm.sort((a, b) => (b.rpeE1rm ?? 0) - (a.rpeE1rm ?? 0));
          const top = withE1rm[0];
          if (!top) {
            setBest(null);
            setLoading(false);
            return;
          }
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
    <RecordCard title="Arvioitu maksimi (RPE)">
      <div className="flex gap-2">
        <ExerciseSearchInput exercises={exercises} value={exerciseId} onChange={setExerciseId} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRepRange((p) => String(Math.max(1, parseInt(p) - 1)))}
              className="flex h-9 w-8 items-center justify-center rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-muted"
            >
              −
            </button>
            <span className="w-8 text-center text-base font-semibold tabular-nums">{repRange}</span>
            <button
              type="button"
              onClick={() => setRepRange((p) => String(Math.min(5, parseInt(p) + 1)))}
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
      ) : best ? (
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {best.weight ?? 0}{" "}
              <span className="text-base font-normal text-muted-foreground">kg</span>
            </div>
            <div className="text-xs text-muted-foreground">
              RPE-arvioitu 1RM: {best.estimated_1rm?.toFixed(1) ?? "—"}kg ·{" "}
              {relativeTime(best.achieved_at)}
            </div>
          </div>
          <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-500">
            e1RM
          </span>
        </div>
      ) : exerciseId ? (
        <p className="text-sm text-muted-foreground">
          Ei tarvittavia tietoja (tarvitaan RPE-arvo).
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Valitse harjoitus nähdäksesi arvioidun maksimin.
        </p>
      )}
    </RecordCard>
  );
}
