import { notFound } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/queries/plans";
import { PlanGrid } from "@/components/plans/plan-grid";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const plan = await getPlan(supabase, id);
  if (!plan) notFound();

  return <PlanGrid initial={plan} />;
}
