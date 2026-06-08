"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { revokeInvitation } from "@/app/coach/clients/actions";
import { Mail, X } from "lucide-react";

export type SentInvite = {
  id: string;
  email: string;
  invited_name: string | null;
  created_at: string;
};

export function SentInvitesButton({ invites }: { invites: SentInvite[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      await revokeInvitation(id);
      toast({ title: "Kutsu peruttu" });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Virhe", description: e.message, variant: "destructive" });
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="btn-spring" onClick={() => setOpen(true)}>
        Lähetetyt kutsut
        {invites.length > 0 && (
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {invites.length}
          </span>
        )}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lähetetyt kutsut</DialogTitle>
          <DialogDescription>
            Odottavat kutsut, joita asiakas ei ole vielä hyväksynyt.
          </DialogDescription>
        </DialogHeader>

        {invites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Mail className="h-8 w-8 opacity-20" />
            <p className="text-sm">Ei odottavia kutsuja.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  {inv.invited_name && (
                    <p className="truncate text-sm font-medium">{inv.invited_name}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{inv.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Lähetetty {new Date(inv.created_at).toLocaleDateString("fi-FI")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={revoking === inv.id}
                  onClick={() => handleRevoke(inv.id)}
                  aria-label="Peruuta kutsu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
