"use client";

import { Sparkle } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { changelogFor, type ChangelogRole } from "@/lib/changelog";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });
}

export function WhatsNewDialog({
  role,
  open,
  onOpenChange,
}: {
  role: ChangelogRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const entries = changelogFor(role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle size={18} weight="fill" className="text-primary" />
            Uutta Gainlyssä
          </DialogTitle>
          <DialogDescription>Viimeisimmät päivitykset ja uudet ominaisuudet.</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 max-h-[60vh] space-y-5 overflow-y-auto px-1">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ei päivityksiä vielä.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="relative border-l-2 border-border pl-4">
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {formatDate(entry.date)}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{entry.title}</p>
                <ul className="mt-1.5 space-y-1">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
