import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteClientButton } from "@/components/coach/invite-client-button";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data } = await supabase
    .from("coach_clients")
    .select("client_id, status, profiles:client_id(id, full_name, avatar_url)")
    .eq("coach_id", user.user.id);

  const rows = (data ?? []).filter((r) => r.profiles);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <InviteClientButton coachId={user.user.id} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r: any) => (
          <Link key={r.client_id} href={`/coach/clients/${r.client_id}`} prefetch>
            <Card className="transition hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <Avatar>
                    <AvatarFallback>
                      {(r.profiles.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {r.profiles.full_name ?? "Unnamed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{r.status}</CardContent>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">No clients linked yet.</p>}
      </div>
    </div>
  );
}
