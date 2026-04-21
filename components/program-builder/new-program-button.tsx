"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProgram } from "@/lib/queries/programs";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

export function NewProgramButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const prog = await createProgram(supabase, {
        coach_id: user.user.id,
        title,
        description: description || null,
      });
      setOpen(false);
      router.push(`/coach/programs/${prog.id}/edit`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Lisää ohjelma
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lisää ohjelma</DialogTitle>
          <DialogDescription>Luo malli, jonka voit määrittää myöhemmin, tai aloita asiakaskohtainen suunnitelma.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Otsikko</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="desc">Kuvaus</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
          <Button onClick={submit} disabled={submitting || !title}>
            {submitting ? "Luodaan…" : "Luo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
