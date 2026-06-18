import { createClient, getCachedUser } from "@/lib/supabase/server";
import { InviteClientButton } from "@/components/coach/invite-client-button";
import { SentInvitesButton } from "@/components/coach/sent-invites-button";
import { UserRound } from "lucide-react";
import { ClientRoster } from "@/components/coach/client-roster";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data } = await supabase
    .from("coach_clients")
    .select("client_id, status, profiles:client_id(id, full_name, avatar_url, created_at)")
    .eq("coach_id", user.id);

  const rows = (data ?? []).filter((r: any) => r.profiles);

  const { data: invites } = await supabase
    .from("invitations")
    .select("id, email, invited_name, created_at")
    .eq("coach_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const clientIds = rows.map((r: any) => r.client_id as string);

  const pendingRes = clientIds.length > 0
    ? await supabase
        .from("scheduled_workouts")
        .select("client_id, program_days(name, program_weeks(is_active))")
        .in("client_id", clientIds)
        .eq("status", "pending")
    : { data: [] as any[] };

  const pendingByClient = new Map<string, { count: number; next: any }>();
  for (const w of pendingRes.data ?? []) {
    if ((w as any).program_days?.program_weeks?.is_active !== true) continue;
    const cid = (w as any).client_id as string;
    const cur = pendingByClient.get(cid) ?? { count: 0, next: null };
    if (!cur.next) cur.next = w;
    cur.count++;
    pendingByClient.set(cid, cur);
  }

  // Card data, sorted alphabetically (Finnish locale).
  const clients = rows
    .map((r: any) => {
      const pendingEntry = pendingByClient.get(r.client_id);
      const pendingCount = pendingEntry?.count ?? 0;
      const nextName = pendingEntry?.next
        ? ((pendingEntry.next as any).program_days?.name?.replace(/^Day(\d+)/, "Päivä $1") ?? "Treeni")
        : null;
      const pendingLabel = pendingCount === 0
        ? "Ei ohjelmoituja treenejä"
        : `${pendingCount} ${pendingCount === 1 ? "treeni" : "treeniä"} jäljellä`;
      return {
        id: r.client_id as string,
        name: (r.profiles.full_name ?? "Unnamed") as string,
        status: r.status as string,
        nextName,
        pendingCount,
        pendingLabel,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fi"));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="card-enter font-display text-2xl font-semibold">Asiakkaat</h1>
        <div className="card-enter card-enter-1 flex items-center gap-2">
          <SentInvitesButton invites={invites ?? []} />
          <InviteClientButton coachId={user.id} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card-enter card-enter-2 mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <UserRound className="h-12 w-12 opacity-20" />
          <p className="text-sm">Ei vielä linkitettyjä asiakkaita.</p>
          <p className="max-w-xs text-xs">Kutsu ensimmäinen asiakkaasi sähköpostilla — hän saa linkin, jolla tili yhdistyy sinuun.</p>
          <div className="mt-1"><InviteClientButton coachId={user.id} /></div>
        </div>
      ) : (
        <ClientRoster clients={clients} />
      )}
    </div>
  );
}
