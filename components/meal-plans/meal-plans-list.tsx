"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";

type Plan = {
  id: string;
  title: string;
  description: string | null;
};

export function MealPlansList({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null);

  const filtered = search.trim()
    ? plans.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : plans;

  async function handleDelete() {
    if (!pendingDelete) return;
    const { error } = await createClient().from("meal_plans").delete().eq("id", pendingDelete.id);
    setPendingDelete(null);
    if (error) {
      toast({ title: "Poisto epäonnistui", description: error.message });
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mt-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hae ruokaohjelmia…"
          className="h-10 w-full md:max-w-xs"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className="relative">
            <Link
              href={`/coach/meal-plans/${p.id}/edit`}
              prefetch
              className="group block overflow-hidden rounded-2xl border bg-card p-5 pr-12 transition-all hover:shadow-md active:scale-[0.99]"
            >
              <p className="font-semibold leading-snug">{p.title}</p>
              {p.description && (
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setPendingDelete(p)}
              aria-label="Poista ruokaohjelma"
              className="absolute right-2 top-2 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full mt-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 opacity-20" />
            <p className="text-sm">{search ? "Ei hakutuloksia." : "Ei vielä ruokaohjelmia."}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Poistetaanko ruokaohjelma?"
        description={`"${pendingDelete?.title ?? ""}" poistetaan pysyvästi. Asiakkaille jaetut kopiot säilyvät.`}
        confirmLabel="Poista"
        onConfirm={handleDelete}
      />
    </>
  );
}
