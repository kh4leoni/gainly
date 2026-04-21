"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProgram } from "@/lib/queries/programs";
import { Button } from "@/components/ui/button";

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

  async function handleOhjelmoi() {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    let programId = existingProgramId;

    if (!programId) {
      const prog = await createProgram(supabase, {
        coach_id: user.user.id,
        title: `Harjoitusohjelma: ${clientName}`,
        description: null,
        client_id: clientId,
      });
      programId = prog.id;
    }

    router.push(`/coach/client-programs/${programId}/edit`);
    router.refresh();
  }

  return (
    <Button onClick={handleOhjelmoi}>
      Ohjelmoi
    </Button>
  );
}
