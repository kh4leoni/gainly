"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { changePassword } from "@/app/client/actions";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (next.length < 8) {
      setError("Uuden salasanan tulee olla vähintään 8 merkkiä.");
      return;
    }
    if (next !== confirm) {
      setError("Uudet salasanat eivät täsmää.");
      return;
    }
    startTransition(async () => {
      try {
        await changePassword(current, next);
        toast({ title: "Salasana vaihdettu" });
        reset();
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Salasanan vaihto epäonnistui.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vaihda salasana</DialogTitle>
          <DialogDescription>
            Syötä nykyinen salasanasi ja valitse uusi (vähintään 8 merkkiä).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cur-pw">Nykyinen salasana</Label>
            <Input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-pw">Uusi salasana</Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="conf-pw">Vahvista uusi salasana</Label>
            <Input
              id="conf-pw"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Peruuta
          </Button>
          <Button onClick={submit} disabled={pending || !current || !next || !confirm}>
            {pending ? "Vaihdetaan…" : "Vaihda salasana"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
