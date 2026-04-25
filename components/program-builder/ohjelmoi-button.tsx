"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProgram } from "@/lib/queries/programs";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

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

  async function handleOhjelmoi() {
    if (existingProgramId) {
      router.push(`/coach/client-programs/${existingProgramId}/edit`);
      router.refresh();
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
      router.push(`/coach/client-programs/${prog.id}/edit`);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Button onClick={handleOhjelmoi} disabled={working}>
      <Pencil className="h-4 w-4" />
      {working ? "Luodaan…" : "Ohjelmoi"}
    </Button>
  );
}
