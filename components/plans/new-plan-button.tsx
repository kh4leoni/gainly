"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPlan } from "@/lib/queries/plans";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function NewPlanButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const id = await createPlan(supabase, user.user.id);
      router.push(`/coach/plans/${id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      onClick={submit}
      disabled={submitting}
      className="border-none transition-transform hover:scale-[1.04] active:scale-[0.97]"
      style={{
        background: "var(--c-cta-bg)",
        color: "var(--c-cta-fg, #fff)",
        boxShadow: "0 4px 14px var(--c-cta-glow)",
      }}
    >
      <Plus className="h-4 w-4" />
      {submitting ? "Luodaan…" : "Uusi suunnitelma"}
    </Button>
  );
}
