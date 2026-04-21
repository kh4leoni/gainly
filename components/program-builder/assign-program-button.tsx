"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getClients } from "@/lib/queries/coach";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export function AssignProgramButton({ programId }: { programId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [working, setWorking] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    enabled: open,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      return getClients(supabase, user.user.id);
    },
  });

  async function assign() {
    if (!clientId) return;
    setWorking(true);
    try {
      const { data: newProgId, error: copyErr } = await supabase.rpc("copy_program", {
        _source: programId, _client: clientId,
      });
      if (copyErr) throw copyErr;
      const { error: rpcErr } = await supabase.rpc("schedule_program", {
        _program: newProgId, _client: clientId, _start_date: startDate,
      });
      if (rpcErr) throw rpcErr;
      toast({ title: "Program assigned", description: "Sessions scheduled." });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: "Assign failed", description: e.message, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline">Assign</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign program</DialogTitle>
          <DialogDescription>Schedules one workout per day starting on the chosen date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c: any) => (
                  <SelectItem key={c.client_id} value={c.client_id}>
                    {c.profiles?.full_name ?? c.client_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start">Start date</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={assign} disabled={!clientId || working}>
            {working ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
