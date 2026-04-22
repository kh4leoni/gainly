"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getCoachDashboard } from "@/lib/queries/coach";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";

export function CoachDashboardView() {
  const supabase = createClient();
  const { data, isLoading } = useQuery({
    queryKey: ["coach", "dashboard"],
    queryFn: () => getCoachDashboard(supabase),
  });

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Tänään</h1>
      <p className="text-muted-foreground">Asiakkaat yhdellä silmäyksellä.</p>

      <div className="mt-6 rounded-xl border overflow-hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse border-b bg-muted last:border-0" />
          ))
        ) : (
          <ul>
            {(data ?? []).map((row) => (
              <li key={row.client_id}>
                <Link
                  href={`/coach/clients/${row.client_id}`}
                  prefetch
                  className="flex h-16 items-center gap-3 border-b px-4 last:border-0 hover:bg-accent/60 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {(row.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{row.full_name ?? "Unnamed"}</span>
                      {row.today_status ? (
                        <Badge variant={row.today_status === "completed" ? "success" : "secondary"} className="shrink-0">
                          {row.today_status === "completed" ? "Valmis" : "Odottaa"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">ei istuntoa</Badge>
                      )}
                    </div>
                    {row.last_pr_at && (
                      <p className="text-xs text-muted-foreground">PR {relativeTime(row.last_pr_at)}</p>
                    )}
                  </div>
                  {row.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                      {row.unread_count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
            {data && data.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">Ei aktiivisia asiakkaita vielä.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}