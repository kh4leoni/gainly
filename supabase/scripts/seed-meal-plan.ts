// Seed a sample meal plan for local dev and verify the full flow:
// coach signs in → builds a template (real Fineli foods) → assigns it to a
// client via copy_meal_plan. Run after seed-users.ts and import-fineli.ts.
//
//   npx tsx supabase/scripts/seed-meal-plan.ts
//
// Idempotent: removes any prior template with the same title first.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const TITLE = "Esimerkkiruokavalio";

// term = Fineli search term, number = grams.
type Item = [string, number];
type Opt = { name?: string; items: Item[] };
// A meal has one or more interchangeable options.
const one = (items: Item[]): Opt[] => [{ items }];

const PLAN: Array<{ day: string; meals: Array<{ name: string; options: Opt[] }> }> = [
  {
    day: "Arkipäivä",
    meals: [
      {
        name: "Aamupala",
        // Three interchangeable options to demo the selector.
        options: [
          { name: "Kaurapuuro", items: [["kaurahiutale", 80], ["maito, rasvaton", 250], ["banaani", 120]] },
          { name: "Munakas", items: [["kananmuna", 150], ["ruisleipä", 70], ["juusto", 30]] },
          { name: "Smoothie", items: [["raejuusto", 200], ["banaani", 120], ["mustikka", 100]] },
        ],
      },
      { name: "Lounas", options: one([["broileri", 150], ["riisi, keitetty", 200], ["porkkana", 100]]) },
      { name: "Välipala", options: one([["raejuusto", 200], ["omena", 130]]) },
      { name: "Päivällinen", options: one([["lohi", 150], ["peruna", 250], ["parsakaali", 150]]) },
    ],
  },
  {
    day: "Treenipäivä",
    meals: [
      { name: "Aamupala", options: one([["kananmuna", 120], ["ruisleipä", 70], ["juusto", 30]]) },
      {
        name: "Lounas",
        options: [
          { name: "Liha", items: [["jauheliha, naudan", 150], ["pasta, keitetty", 220]] },
          { name: "Kala", items: [["lohi", 160], ["riisi, keitetty", 220]] },
        ],
      },
      { name: "Palautusjuoma", options: one([["heraproteiini", 35], ["banaani", 120]]) },
      { name: "Päivällinen", options: one([["broileri", 180], ["bataatti", 250]]) },
    ],
  },
];

async function main() {
  const s = createClient(URL, ANON, { auth: { persistSession: false } });

  const pickFood = async (term: string) => {
    const { data } = await s
      .from("foods")
      .select("id, name_fi, energy_kcal")
      .ilike("name_fi", `%${term}%`)
      .not("energy_kcal", "is", null)
      .order("name_fi")
      .limit(1)
      .maybeSingle();
    return data as { id: number; name_fi: string } | null;
  };

  const { error: authErr } = await s.auth.signInWithPassword({
    email: "coach@gainly.local",
    password: "password",
  });
  if (authErr) throw new Error(`coach login failed: ${authErr.message}`);
  const { data: u } = await s.auth.getUser();
  const coachId = u.user!.id;

  // Clean slate: drop prior template (and its assigned copies share title — leave those).
  await s.from("meal_plans").delete().eq("coach_id", coachId).is("client_id", null).eq("title", TITLE);

  const { data: plan, error: planErr } = await s
    .from("meal_plans")
    .insert({ coach_id: coachId, title: TITLE, description: "Malliruokavalio ~2200 kcal. Säädä asiakkaan tarpeisiin." })
    .select()
    .single();
  if (planErr) throw planErr;

  for (let d = 0; d < PLAN.length; d++) {
    const dayDef = PLAN[d]!;
    const { data: day } = await s
      .from("meal_plan_days")
      .insert({ plan_id: plan.id, day_number: d + 1, name: dayDef.day })
      .select()
      .single();

    for (let mi = 0; mi < dayDef.meals.length; mi++) {
      const mealDef = dayDef.meals[mi]!;
      const { data: meal } = await s
        .from("meals")
        .insert({ day_id: day!.id, order_idx: mi + 1, name: mealDef.name })
        .select()
        .single();

      for (let oi = 0; oi < mealDef.options.length; oi++) {
        const optDef = mealDef.options[oi]!;
        const { data: option } = await s
          .from("meal_options")
          .insert({ meal_id: meal!.id, order_idx: oi, name: optDef.name ?? null })
          .select()
          .single();

        let ii = 0;
        for (const [term, grams] of optDef.items) {
          const food = await pickFood(term);
          if (!food) {
            console.warn(`  ! no food for "${term}" — skipped`);
            continue;
          }
          await s.from("meal_items").insert({
            meal_option_id: option!.id,
            food_id: food.id,
            food_name: food.name_fi,
            amount_g: grams,
            order_idx: ++ii,
          });
        }
      }
    }
  }
  console.log(`OK template "${TITLE}" created (${PLAN.length} days).`);

  // Assign to first active client.
  const { data: cc } = await s
    .from("coach_clients")
    .select("client_id, profiles:client_id(full_name)")
    .eq("coach_id", coachId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!cc) {
    console.warn("No active client to assign to — run seed-users.ts first.");
    return;
  }
  const { data: newId, error: rpcErr } = await s.rpc("copy_meal_plan", {
    _source: plan.id,
    _client: cc.client_id,
  });
  if (rpcErr) throw rpcErr;
  const clientName = (cc.profiles as unknown as { full_name: string | null } | null)?.full_name ?? cc.client_id;
  console.log(`OK assigned to client "${clientName}" → plan ${newId}`);
  console.log("Meal plan seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
