"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getMonthWorkouts } from "@/lib/queries/workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CalendarView({
  year,
  month,
  initial,
  clientId,
}: {
  year: number;
  month: number;
  initial: Array<{ id: string; scheduled_date: string; status: string; program_days?: { name?: string | null } | null }>;
  clientId: string;
}) {
  const supabase = createClient();
  const { data = initial } = useQuery({
    queryKey: ["month", clientId, year, month],
    queryFn: () => getMonthWorkouts(supabase, clientId, year, month),
    initialData: initial,
    enabled: !!clientId,
  });

  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startCol = (first.getUTCDay() + 6) % 7; // Monday-first

  const byDate = new Map<string, typeof data[number]>();
  for (const w of data) byDate.set(w.scheduled_date, w);

  const cells: Array<{ date: string | null; workout?: typeof data[number] | null; day?: number }> = [];
  for (let i = 0; i < startCol; i++) cells.push({ date: null });
  for (let d = 1; d <= last; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: iso, workout: byDate.get(iso) ?? null, day: d });
  }

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {new Date(year, month - 1, 1).toLocaleString("fi-FI", { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex gap-2">
            <Button asChild size="icon" variant="ghost">
              <Link href={`/client/calendar?y=${prev.y}&m=${prev.m}`} prefetch><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link href={`/client/calendar?y=${next.y}&m=${next.m}`} prefetch><ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c.date) return <div key={i} className="aspect-square rounded-md" />;
              const w = c.workout;
              const dot = w
                ? w.status === "completed"
                  ? "bg-green-600"
                  : "bg-amber-500"
                : "";
              return (
                <Link
                  key={i}
                  href={w ? `/client/workout/${w.id}` : "#"}
                  prefetch={!!w}
                  className={cn(
                    "aspect-square rounded-md border p-1 text-left text-xs",
                    w ? "hover:bg-accent" : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{c.day}</span>
                    {w && <span className={cn("h-2 w-2 rounded-full", dot)} />}
                  </div>
                  {w && <div className="truncate text-[10px]">{w.program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? ""}</div>}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
