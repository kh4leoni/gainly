"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

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
          toast({
            variant: "success",
            title: "Uusi ennätys!",
            description: `${pr.weight}kg × ${pr.reps} (${pr.rep_range})`,
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
