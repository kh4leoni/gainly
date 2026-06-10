import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMealPlanFull } from "@/lib/queries/meals";
import { MealPlanEditor } from "@/components/meal-plans/meal-plan-editor";

export const dynamic = "force-dynamic";

export default async function MealPlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let plan;
  try {
    plan = await getMealPlanFull(supabase, id);
  } catch {
    notFound();
  }

  return <MealPlanEditor initial={plan} />;
}
