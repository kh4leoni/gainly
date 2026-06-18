"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Plus, ChevronRight, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import { ProgramsDialog, type ClientProgram } from "@/components/client-detail/programs-dialog";

export function ClientProgramsCard({
  clientId,
  programs,
}: {
  clientId: string;
  programs: ClientProgram[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ClientProgram | null>(null);

  async function handleDelete() {
    if (!pendingDelete) return;
    const supabase = createClient();
    // Drop this program's scheduled workouts first — programs.program_id is
    // set-null on cascade, which would otherwise orphan them. Logged history
    // (workout_logs / set_logs) is preserved (also set-null).
    await supabase.from("scheduled_workouts").delete().eq("program_id", pendingDelete.id).eq("client_id", clientId);
    const { error } = await supabase.from("programs").delete().eq("id", pendingDelete.id);
    setPendingDelete(null);
    if (error) {
      toast({ title: "Poisto epäonnistui", description: error.message });
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Ohjelmat</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Uusi ohjelma
        </button>
      </div>

      {programs.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Ei vielä ohjelmia.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {programs.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <Link
                href={`/coach/client-programs/${p.id}/edit`}
                prefetch
                className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <span className="truncate flex-1">{p.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => setPendingDelete(p)}
                aria-label="Poista ohjelma"
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ProgramsDialog open={open} onOpenChange={setOpen} programs={programs} clientId={clientId} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Poistetaanko koko ohjelma?"
        description={`Ohjelma "${pendingDelete?.title ?? ""}" ja kaikki sen jaksot, viikot ja treenipäivät poistetaan pysyvästi, eikä tätä voi perua. Asiakkaan jo tekemät treenit säilyvät historiassa.`}
        confirmLabel="Poista ohjelma"
        onConfirm={handleDelete}
      />
    </div>
  );
}
