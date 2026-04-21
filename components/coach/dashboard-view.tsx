"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getCoachDashboard } from "@/lib/queries/coach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="text-muted-foreground">Your clients at a glance.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))
          : (data ?? []).map((row) => (
              <Link key={row.client_id} href={`/coach/clients/${row.client_id}`} prefetch>
                <Card className="transition hover:border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-base">
                      <Avatar>
                        <AvatarFallback>{(row.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {row.full_name ?? "Unnamed"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                    {row.today_status ? (
                      <Badge variant={row.today_status === "completed" ? "success" : "secondary"}>
                        {row.today_status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">no session</Badge>
                    )}
                    {row.unread_count > 0 && (
                      <Badge variant="destructive">{row.unread_count} unread</Badge>
                    )}
                    {row.last_pr_at && (
                      <span className="text-muted-foreground">PR {relativeTime(row.last_pr_at)}</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}

        {data && data.length === 0 && (
          <p className="text-muted-foreground">No active clients yet.</p>
        )}
      </div>
    </div>
  );
}
