"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProgram } from "@/lib/queries/programs";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getNextMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function OhjelmoiButton({
  clientId,
  clientName,
  existingProgramId,
}: {
  clientId: string;
  clientName: string;
  existingProgramId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(getNextMonday(new Date()));
  const [working, setWorking] = useState(false);

  async function handleOhjelmoi() {
    if (existingProgramId) {
      router.push(`/coach/client-programs/${existingProgramId}/edit`);
      router.refresh();
      return;
    }
    setOpen(true);
  }

  async function handleConfirm() {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    setWorking(true);
    try {
      const prog = await createProgram(supabase, {
        coach_id: user.user.id,
        title: `Harjoitusohjelma: ${clientName}`,
        description: null,
        client_id: clientId,
      });

      const { error: rpcErr } = await supabase.rpc("schedule_program", {
        _program: prog.id,
        _client: clientId,
        _start_date: startDate,
      });
      if (rpcErr) throw rpcErr;

      setOpen(false);
      router.push(`/coach/client-programs/${prog.id}/edit`);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <Button onClick={handleOhjelmoi}>
        Ohjelmoi
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajoita harjoitusohjelma</DialogTitle>
            <DialogDescription>
              Valitse päivämäärä, josta alkaen asiakkaan treenit ajoitetaan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="start">Aloituspäivämäärä</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
            <Button onClick={handleConfirm} disabled={working}>
              {working ? "Ajoitetaan…" : "Ajoita ja muokkaa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
