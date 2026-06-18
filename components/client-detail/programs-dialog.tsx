"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProgram } from "@/lib/queries/programs";
import { usePendingNav } from "@/lib/nav-context";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Pencil, Plus } from "lucide-react";

export type ClientProgram = { id: string; title: string };

// Shared program chooser: lists the client's programs (open one) and creates a
// new named one. Used both by the header "Ohjelmoi" button and the programs card.
export function ProgramsDialog({
  open, onOpenChange, programs, clientId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  programs: ClientProgram[];
  clientId: string;
}) {
  const router = useRouter();
  const { setPendingHref } = usePendingNav();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  function go(id: string) {
    const href = `/coach/client-programs/${id}/edit`;
    setPendingHref(href);
    router.push(href);
    onOpenChange(false);
  }

  async function create() {
    const title = name.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const prog = await createProgram(supabase, { coach_id: user.user.id, title, client_id: clientId });
      await supabase.rpc("schedule_program", { _program: prog.id, _client: clientId });
      router.refresh();
      go(prog.id);
    } catch (e: any) {
      toast({ title: "Ohjelman luonti epäonnistui", description: e?.message });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ohjelmat</DialogTitle>
          <DialogDescription>Avaa olemassa oleva ohjelma tai luo uusi.</DialogDescription>
        </DialogHeader>

        {programs.length > 0 && (
          <div className="flex flex-col gap-2">
            {programs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(p.id)}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 border-t pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Uusi ohjelma</p>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") create(); }}
              placeholder="Ohjelman nimi"
              autoFocus={programs.length === 0}
            />
            <Button onClick={create} disabled={!name.trim() || creating}>
              <Plus className="h-4 w-4" />
              {creating ? "Luodaan…" : "Luo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
