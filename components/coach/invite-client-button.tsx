"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { inviteClient } from "@/app/coach/clients/actions";

export function InviteClientButton({ coachId }: { coachId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setWorking(true);
    try {
      const result = await inviteClient(coachId, email, name || undefined);
      if (result.type === "invited") {
        toast({ title: "Kutsu lähetetty", description: `Kutsusähköposti lähetetty osoitteeseen ${email}.` });
      } else {
        toast({ title: "Asiakas linkitetty", description: `${email} on lisätty asiakkaaksesi.` });
      }
      setOpen(false);
      setEmail("");
      setName("");
      router.refresh();
    } catch (e: any) {
      toast({ title: "Virhe", description: e.message, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="btn-spring" onClick={() => setOpen(true)}>Kutsu asiakas</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kutsu asiakas</DialogTitle>
          <DialogDescription>
            Anna asiakkaan sähköpostiosoite. Jos hänellä ei ole vielä tiliä, hän saa kutsusähköpostin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email">Sähköposti</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asiakas@esimerkki.fi"
            />
          </div>
          <div>
            <Label htmlFor="name">Nimi (valinnainen)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Matti Meikäläinen"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
            <Button type="submit" disabled={!email || working}>
              {working ? "Lähetetään…" : "Lähetä kutsu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
