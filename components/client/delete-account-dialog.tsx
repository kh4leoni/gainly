"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { deleteAccount } from "@/app/client/actions";

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setValue("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (value !== "POISTA") {
      setError("Kirjoita POISTA isoilla kirjaimilla vahvistaaksesi.");
      return;
    }
    startTransition(async () => {
      try {
        await deleteAccount(value);
        toast({ title: "Tili poistettu" });
        // Hard navigation so the cookie-bound session is dropped along with caches.
        window.location.replace("/login");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Tilin poisto epäonnistui.");
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
          <DialogTitle>Poista tili pysyvästi?</DialogTitle>
          <DialogDescription>
            Tämä poistaa profiilin, treenihistorian, mittaukset ja viestit. Toimintoa ei voi
            peruuttaa. Vahvista kirjoittamalla <strong>POISTA</strong> alle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-delete">Vahvistus</Label>
          <Input
            id="confirm-delete"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="POISTA"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Peruuta
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending || value !== "POISTA"}>
            {pending ? "Poistetaan…" : "Poista tili"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
