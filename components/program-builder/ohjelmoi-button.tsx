"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProgram } from "@/lib/queries/programs";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { usePendingNav } from "@/lib/nav-context";

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
  const [working, setWorking] = useState(false);
  const { setPendingHref } = usePendingNav();

  async function handleOhjelmoi() {
    if (existingProgramId) {
      const href = `/coach/client-programs/${existingProgramId}/edit`;
      setPendingHref(href);
      router.push(href);
      return;
    }
    setWorking(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const prog = await createProgram(supabase, {
        coach_id: user.user.id,
        title: `Harjoitusohjelma: ${clientName}`,
        description: null,
        client_id: clientId,
      });
      const { error } = await supabase.rpc("schedule_program", {
        _program: prog.id,
        _client: clientId,
      });
      if (error) throw error;
      const href = `/coach/client-programs/${prog.id}/edit`;
      setPendingHref(href);
      router.push(href);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Button className="icon-wiggle" onClick={handleOhjelmoi} disabled={working}>
      <Pencil className="h-4 w-4" />
      {working ? "Luodaan…" : "Ohjelmoi"}
    </Button>
  );
}
