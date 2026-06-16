import { createClient, getCachedUser } from "@/lib/supabase/server";
import { listPlans } from "@/lib/queries/plans";
import { NewPlanButton } from "@/components/plans/new-plan-button";
import { PlansList } from "@/components/plans/plans-list";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const plans = await listPlans(supabase, user.id);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="card-enter font-display text-2xl font-semibold">Suunnitelmat</h1>
        <div className="card-enter card-enter-1"><NewPlanButton /></div>
      </div>
      <div className="card-enter card-enter-2 mt-4 mb-6 rounded-lg border bg-muted/40 p-4">
        <h2 className="text-base font-medium">Progression raakileet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Luonnostele liikkeiden progressio viikko viikolta vapaaseen ruudukkoon. Ota siitä mallia, kun ohjelmoit varsinaiset treenit editorissa.
        </p>
      </div>
      <div className="card-enter card-enter-3"><PlansList plans={plans} /></div>
    </div>
  );
}
