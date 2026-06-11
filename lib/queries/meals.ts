import type { DB } from "./types";

// ---------------------------------------------------------------------
// Food search (Fineli reference data)
// ---------------------------------------------------------------------
export type Food = {
  id: number;
  name_fi: string;
  name_en: string | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carb_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
};

// Trigram-backed ILIKE search over the coach's food-picker popover.
export async function searchFoods(supabase: DB, query: string, limit = 25): Promise<Food[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from("foods")
    .select("id, name_fi, name_en, energy_kcal, protein_g, fat_g, carb_g, fiber_g, sugar_g")
    .or(`name_fi.ilike.%${q}%,name_en.ilike.%${q}%`)
    .order("name_fi")
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Food[];
}

// ---------------------------------------------------------------------
// Meal plans
// ---------------------------------------------------------------------
export async function listMealPlans(supabase: DB, coachId: string) {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, title, description, client_id, is_template, created_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// The client view shows the most recently created plan assigned to them.
export async function getClientMealPlanId(supabase: DB, clientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Template plans (client_id is null) — assignable to clients.
export async function listTemplateMealPlans(supabase: DB, coachId: string) {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, title, description")
    .eq("coach_id", coachId)
    .eq("is_template", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Deep-copies a template into a new client-assigned plan (SQL RPC). Returns
// the new plan id. Call once per client to hand the same plan to many.
export async function assignMealPlan(supabase: DB, sourceId: string, clientId: string): Promise<string> {
  const { data, error } = await supabase.rpc("copy_meal_plan", { _source: sourceId, _client: clientId });
  if (error) throw error;
  return data as string;
}

export type MealItemRow = {
  id: string;
  order_idx: number;
  food_id: number | null;
  food_name: string;
  amount_g: number;
  foods: {
    energy_kcal: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carb_g: number | null;
  } | null;
};

export type MealOption = {
  id: string;
  order_idx: number;
  name: string | null;
  meal_items: MealItemRow[];
};

export type MealRow = {
  id: string;
  order_idx: number;
  name: string | null;
  notes: string | null;
  meal_options: MealOption[];
};

export type MealPlanDay = {
  id: string;
  day_number: number;
  name: string | null;
  meals: MealRow[];
};

export type MealPlanFull = {
  id: string;
  title: string;
  description: string | null;
  coach_id: string;
  client_id: string | null;
  is_template: boolean;
  meal_plan_days: MealPlanDay[];
};

export async function getMealPlanFull(supabase: DB, planId: string): Promise<MealPlanFull> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select(`
      id, title, description, coach_id, client_id, is_template,
      meal_plan_days (
        id, day_number, name,
        meals (
          id, order_idx, name, notes,
          meal_options (
            id, order_idx, name,
            meal_items (
              id, order_idx, food_id, food_name, amount_g,
              foods ( energy_kcal, protein_g, fat_g, carb_g )
            )
          )
        )
      )
    `)
    .eq("id", planId)
    .single();
  if (error) throw error;

  // Supabase nested ordering has limited depth — sort in JS.
  const raw = data as unknown as MealPlanFull;
  raw.meal_plan_days.sort((a, b) => a.day_number - b.day_number);
  for (const day of raw.meal_plan_days) {
    day.meals.sort((a, b) => a.order_idx - b.order_idx);
    for (const meal of day.meals) {
      meal.meal_options.sort((a, b) => a.order_idx - b.order_idx);
      for (const opt of meal.meal_options) {
        opt.meal_items.sort((a, b) => a.order_idx - b.order_idx);
      }
    }
  }
  return raw;
}

export async function createMealPlan(
  supabase: DB,
  input: { coach_id: string; title: string; description?: string | null; client_id?: string | null }
) {
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({
      coach_id: input.coach_id,
      title: input.title,
      description: input.description ?? null,
      client_id: input.client_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Seed day 1 so the editor is immediately useful.
  await supabase.from("meal_plan_days").insert({ plan_id: plan.id, day_number: 1, name: "Päivä 1" });
  return plan;
}

// ---------------------------------------------------------------------
// Macro maths — one place so coach editor and client view agree.
// ---------------------------------------------------------------------
export type Macros = { kcal: number; protein: number; fat: number; carb: number };

const ZERO: Macros = { kcal: 0, protein: 0, fat: 0, carb: 0 };

export function itemMacros(item: MealItemRow): Macros {
  const f = item.foods;
  if (!f) return { ...ZERO };
  const factor = item.amount_g / 100;
  return {
    kcal: (f.energy_kcal ?? 0) * factor,
    protein: (f.protein_g ?? 0) * factor,
    fat: (f.fat_g ?? 0) * factor,
    carb: (f.carb_g ?? 0) * factor,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carb: acc.carb + m.carb,
    }),
    { ...ZERO }
  );
}

export function optionMacros(option: MealOption): Macros {
  return sumMacros(option.meal_items.map(itemMacros));
}

// Macros of the meal under a given option (defaults to the first option,
// which is what the client sees before choosing).
export function mealMacros(meal: MealRow, optionIdx = 0): Macros {
  const opt = meal.meal_options[optionIdx] ?? meal.meal_options[0];
  return opt ? optionMacros(opt) : { ...ZERO };
}

// `selections` maps meal.id → chosen option index. Missing → first option.
export function dayMacros(day: MealPlanDay, selections?: Record<string, number>): Macros {
  return sumMacros(day.meals.map((m) => mealMacros(m, selections?.[m.id] ?? 0)));
}
