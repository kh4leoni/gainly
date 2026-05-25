"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export type PendingInvitation = {
  id: string;
  coach_id: string;
  coach_name: string | null;
  token: string;
  created_at: string;
};

export function InvitationBanner({ invitations }: { invitations: PendingInvitation[] }) {
  const router = useRouter();
  const [working, setWorking] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  async function accept(token: string) {
    setWorking(token);
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_invitation", { _token: token });
    setWorking(null);
    if (error) {
      toast({ title: "Hyväksyntä epäonnistui", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Valmentaja vaihdettu", description: "Olet nyt uuden valmentajan asiakas." });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2 px-4 pt-4 md:px-6">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {inv.coach_name ?? "Valmentaja"} haluaa valmentaa sinua
            </p>
            <p className="text-xs text-muted-foreground">
              Hyväksymällä nykyinen valmennussuhteesi päättyy ja uusi alkaa.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => accept(inv.token)}
            disabled={working === inv.token}
          >
            {working === inv.token ? "Hyväksytään…" : "Hyväksy"}
          </Button>
        </div>
      ))}
    </div>
  );
}
