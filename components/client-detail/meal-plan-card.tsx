"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createMealPlan, assignMealPlan } from "@/lib/queries/meals";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { UtensilsCrossed, Pencil, Plus, LayoutTemplate } from "lucide-react";

type Template = { id: string; title: string; description: string | null };

export function ClientMealPlanCard({
  clientId,
  clientName,
  planId,
  templates,
}: {
  clientId: string;
  clientName: string;
  planId: string | null;
  templates: Template[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function createBlank() {
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const plan = await createMealPlan(supabase, {
        coach_id: user.user.id,
        client_id: clientId,
        title: `${clientName} – ruokaohjelma`,
      });
      router.push(`/coach/meal-plans/${plan.id}/edit`);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function assignTemplate(templateId: string) {
    setAssigning(templateId);
    try {
      const newId = await assignMealPlan(createClient(), templateId, clientId);
      router.push(`/coach/meal-plans/${newId}/edit`);
      router.refresh();
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Ruokaohjelma</span>
        </div>
        {planId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/coach/meal-plans/${planId}/edit`}>
              <Pencil className="h-4 w-4" /> Muokkaa
            </Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            {templates.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
                <LayoutTemplate className="h-4 w-4" /> Käytä mallia
              </Button>
            )}
            <Button size="sm" onClick={createBlank} disabled={creating}>
              <Plus className="h-4 w-4" /> {creating ? "Luodaan…" : "Luo tyhjä"}
            </Button>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {planId
          ? "Asiakkaalla on ruokaohjelma. Muokkaa aterioita ja ruoka-aineita."
          : "Anna valmis malli tai luo tyhjä ruokaohjelma Finelin ravintotiedoilla."}
      </p>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Valitse malli</DialogTitle>
            <DialogDescription>
              {clientName} saa oman kopion valitusta mallista. Voit muokata sitä jälkeenpäin.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 divide-y overflow-y-auto">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => assignTemplate(t.id)}
                  disabled={assigning !== null}
                  className="flex w-full flex-col items-start gap-0.5 py-2.5 text-left hover:bg-accent/50 disabled:opacity-50"
                >
                  <span className="text-sm font-medium">{t.title}</span>
                  {t.description && (
                    <span className="line-clamp-1 text-xs text-muted-foreground">{t.description}</span>
                  )}
                  {assigning === t.id && <span className="text-xs text-muted-foreground">Annetaan…</span>}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
