import { createClient, getCachedUser } from "@/lib/supabase/server";
import { NewMealPlanButton } from "@/components/meal-plans/new-meal-plan-button";
import { MealPlansList } from "@/components/meal-plans/meal-plans-list";

export const dynamic = "force-dynamic";

export default async function MealPlansPage() {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data } = await supabase
    .from("meal_plans")
    .select("id, title, description")
    .eq("coach_id", user.id)
    .eq("is_template", true)
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="card-enter font-display text-2xl font-semibold">Ruokaohjelmat</h1>
        <div className="card-enter card-enter-1"><NewMealPlanButton /></div>
      </div>
      <div className="card-enter card-enter-2 mt-4 mb-6 rounded-lg border bg-muted/40 p-4">
        <h2 className="text-base font-medium">Malliruokaohjelmat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nämä ovat uudelleenkäytettäviä malleja. Henkilökohtaiset ruokaohjelmat luodaan asiakkaan sivulta.
        </p>
      </div>
      <div className="card-enter card-enter-3"><MealPlansList plans={data ?? []} /></div>
    </div>
  );
}
