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
          const e1rm = pr.estimated_1rm != null ? `${roundKg(pr.estimated_1rm)}kg 1RM` : null;
          const source = pr.weight != null && pr.reps != null ? `${pr.weight}kg × ${pr.reps}` : null;
          toast({
            variant: "success",
            title: "Uusi ennätys!",
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
