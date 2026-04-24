"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { roundKg } from "@/lib/calc/one-rm";

// Subscribes to personal_records inserts for a given client and fires a toast.
export function usePrToast(clientId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!clientId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`pr:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "personal_records",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const pr: any = payload.new;
          const reps: number | null = pr.reps ?? null;
          const weight: number | null = pr.weight ?? null;
          const e1rm = pr.estimated_1rm != null ? `${roundKg(pr.estimated_1rm)}kg e1RM` : null;
          const source = weight != null && reps != null ? `${weight}kg × ${reps}` : null;
          toast({
            variant: "success",
            title: reps != null ? `Uusi ${reps}RM-ennätys!` : "Uusi ennätys!",
            description: [e1rm, source && `(${source})`].filter(Boolean).join(" "),
          });
          qc.invalidateQueries({ queryKey: ["prs", clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, qc]);
}
