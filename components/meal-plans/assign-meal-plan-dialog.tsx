"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getClients } from "@/lib/queries/coach";
import { assignMealPlan } from "@/lib/queries/meals";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type ClientRow = { id: string; full_name: string | null };

export function AssignMealPlanDialog({
  open,
  onOpenChange,
  planId,
  planTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string;
  planTitle: string;
}) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setDoneCount(null);
      return;
    }
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const rows = await getClients(supabase, user.user.id);
      const mapped = rows
        .map((r) => {
          const p = r.profiles as unknown as { id: string; full_name: string | null } | null;
          return p ? { id: p.id, full_name: p.full_name } : null;
        })
        .filter((c): c is ClientRow => c !== null);
      setClients(mapped);
      setLoading(false);
    })();
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assign() {
    if (selected.size === 0) return;
    setWorking(true);
    try {
      const supabase = createClient();
      for (const clientId of selected) {
        await assignMealPlan(supabase, planId, clientId);
      }
      setDoneCount(selected.size);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anna asiakkaalle</DialogTitle>
          <DialogDescription>
            Jokainen valittu asiakas saa oman kopion ohjelmasta &ldquo;{planTitle}&rdquo;. Voit muokata kopioita erikseen.
          </DialogDescription>
        </DialogHeader>

        {doneCount !== null ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Check className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">Annettu {doneCount} asiakkaalle.</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {loading && <p className="py-3 text-center text-sm text-muted-foreground">Ladataan…</p>}
            {!loading && clients.length === 0 && (
              <p className="py-3 text-center text-sm text-muted-foreground">Ei aktiivisia asiakkaita.</p>
            )}
            <ul className="divide-y">
              {clients.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-accent/50"
                    >
                      <span className="text-sm">{c.full_name ?? "Nimetön"}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {doneCount === null && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Peruuta</Button>
            <Button onClick={assign} disabled={working || selected.size === 0}>
              {working ? "Annetaan…" : `Anna valituille (${selected.size})`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
