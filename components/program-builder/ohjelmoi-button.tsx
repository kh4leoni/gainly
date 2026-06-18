"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ProgramsDialog, type ClientProgram } from "@/components/client-detail/programs-dialog";

export function OhjelmoiButton({
  clientId,
  programs,
}: {
  clientId: string;
  programs: ClientProgram[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="icon-wiggle" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Ohjelmoi
      </Button>
      <ProgramsDialog open={open} onOpenChange={setOpen} programs={programs} clientId={clientId} />
    </>
  );
}
