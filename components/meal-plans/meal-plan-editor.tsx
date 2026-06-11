"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  type MealPlanFull, type MealPlanDay, type MealRow, type MealOption, type Food,
  itemMacros, optionMacros, dayMacros, type Macros,
} from "@/lib/queries/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FoodSearchDialog } from "./food-search";
import { AssignMealPlanDialog } from "./assign-meal-plan-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Trash2, ChevronLeft, Check, AlertCircle, Loader2, Users, Copy } from "lucide-react";

const fmt = (n: number) => Math.round(n).toString();

// Macro palette — shared with the client view so coach and client read alike.
const MACRO = {
  protein: { color: "#5EC8A8", short: "P" },
  carb: { color: "#E0A458", short: "H" },
  fat: { color: "#8B92E8", short: "R" },
} as const;

function MacroChips({ m }: { m: Macros }) {
  const chip = (color: string, short: string, grams: number) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {short} {fmt(grams)} g
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {chip(MACRO.protein.color, MACRO.protein.short, m.protein)}
      {chip(MACRO.carb.color, MACRO.carb.short, m.carb)}
      {chip(MACRO.fat.color, MACRO.fat.short, m.fat)}
    </div>
  );
}

function KcalBadge({ kcal, accent }: { kcal: number; accent?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
        accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}
    >
      {fmt(kcal)} kcal
    </span>
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tallennetaan…
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" /> Tallennettu
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5" /> Tallennus epäonnistui
    </span>
  );
}

type DelTarget =
  | { kind: "day"; dayId: string }
  | { kind: "meal"; dayId: string; mealId: string }
  | { kind: "option"; dayId: string; mealId: string; optionId: string };

export function MealPlanEditor({ initial }: { initial: MealPlanFull }) {
  const router = useRouter();
  const supabase = createClient();
  const [plan, setPlan] = useState<MealPlanFull>(initial);
  const [pickFor, setPickFor] = useState<{ dayId: string; mealId: string; optionId: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<DelTarget | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [assignOpen, setAssignOpen] = useState(false);

  // Every edit auto-saves; this wraps writes so the header can show status.
  async function persist<T extends { error: unknown }>(op: PromiseLike<T>): Promise<T> {
    setStatus("saving");
    const res = await op;
    if (res.error) {
      setStatus("error");
    } else {
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
    }
    return res;
  }

  // ---- plan ----
  async function saveTitle(title: string) {
    setPlan((p) => ({ ...p, title }));
    await persist(supabase.from("meal_plans").update({ title }).eq("id", plan.id));
  }

  // ---- days ----
  async function addDay() {
    const day_number = Math.max(0, ...plan.meal_plan_days.map((d) => d.day_number)) + 1;
    const { data } = await persist(
      supabase.from("meal_plan_days").insert({ plan_id: plan.id, day_number, name: `Päivä ${day_number}` })
        .select("id, day_number, name").single()
    );
    if (data) setPlan((p) => ({ ...p, meal_plan_days: [...p.meal_plan_days, { ...data, meals: [] }] }));
  }
  async function renameDay(dayId: string, name: string) {
    setPlan((p) => mapDay(p, dayId, (d) => ({ ...d, name })));
    await persist(supabase.from("meal_plan_days").update({ name }).eq("id", dayId));
  }
  async function deleteDay(dayId: string) {
    setPlan((p) => ({ ...p, meal_plan_days: p.meal_plan_days.filter((d) => d.id !== dayId) }));
    await persist(supabase.from("meal_plan_days").delete().eq("id", dayId));
  }

  // ---- meals (always created with one default option) ----
  async function addMeal(day: MealPlanDay) {
    const order_idx = Math.max(0, ...day.meals.map((m) => m.order_idx)) + 1;
    const { data: meal } = await persist(
      supabase.from("meals").insert({ day_id: day.id, order_idx, name: "Ateria" })
        .select("id, order_idx, name, notes").single()
    );
    if (!meal) return;
    const { data: opt } = await persist(
      supabase.from("meal_options").insert({ meal_id: meal.id, order_idx: 0, name: null })
        .select("id, order_idx, name").single()
    );
    const meal_options: MealOption[] = opt ? [{ ...opt, meal_items: [] }] : [];
    setPlan((p) => mapDay(p, day.id, (d) => ({ ...d, meals: [...d.meals, { ...meal, meal_options }] })));
  }
  async function renameMeal(dayId: string, mealId: string, name: string) {
    setPlan((p) => mapMeal(p, dayId, mealId, (m) => ({ ...m, name })));
    await persist(supabase.from("meals").update({ name }).eq("id", mealId));
  }
  async function deleteMeal(dayId: string, mealId: string) {
    setPlan((p) => mapDay(p, dayId, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== mealId) })));
    await persist(supabase.from("meals").delete().eq("id", mealId));
  }

  // ---- options ----
  async function addOption(dayId: string, meal: MealRow) {
    const order_idx = Math.max(-1, ...meal.meal_options.map((o) => o.order_idx)) + 1;
    const { data } = await persist(
      supabase.from("meal_options").insert({ meal_id: meal.id, order_idx, name: null })
        .select("id, order_idx, name").single()
    );
    if (data) {
      setPlan((p) => mapMeal(p, dayId, meal.id, (m) => ({ ...m, meal_options: [...m.meal_options, { ...data, meal_items: [] }] })));
    }
  }
  async function renameOption(dayId: string, mealId: string, optionId: string, name: string) {
    setPlan((p) => mapOption(p, dayId, mealId, optionId, (o) => ({ ...o, name: name || null })));
    await persist(supabase.from("meal_options").update({ name: name || null }).eq("id", optionId));
  }
  async function deleteOption(dayId: string, mealId: string, optionId: string) {
    setPlan((p) => mapMeal(p, dayId, mealId, (m) => ({ ...m, meal_options: m.meal_options.filter((o) => o.id !== optionId) })));
    await persist(supabase.from("meal_options").delete().eq("id", optionId));
  }

  // ---- items ----
  async function addItem(dayId: string, mealId: string, optionId: string, food: Food) {
    const opt = plan.meal_plan_days.find((d) => d.id === dayId)?.meals
      .find((m) => m.id === mealId)?.meal_options.find((o) => o.id === optionId);
    const order_idx = Math.max(0, ...(opt?.meal_items.map((i) => i.order_idx) ?? [])) + 1;
    const { data } = await persist(
      supabase.from("meal_items")
        .insert({ meal_option_id: optionId, food_id: food.id, food_name: food.name_fi, amount_g: 100, order_idx })
        .select("id, order_idx, food_id, food_name, amount_g").single()
    );
    if (data) {
      const row = {
        ...data,
        foods: { energy_kcal: food.energy_kcal, protein_g: food.protein_g, fat_g: food.fat_g, carb_g: food.carb_g },
      };
      setPlan((p) => mapOption(p, dayId, mealId, optionId, (o) => ({ ...o, meal_items: [...o.meal_items, row] })));
    }
  }
  async function updateAmount(dayId: string, mealId: string, optionId: string, itemId: string, amount_g: number) {
    setPlan((p) => mapOption(p, dayId, mealId, optionId, (o) => ({
      ...o, meal_items: o.meal_items.map((i) => (i.id === itemId ? { ...i, amount_g } : i)),
    })));
    await persist(supabase.from("meal_items").update({ amount_g }).eq("id", itemId));
  }
  async function deleteItem(dayId: string, mealId: string, optionId: string, itemId: string) {
    setPlan((p) => mapOption(p, dayId, mealId, optionId, (o) => ({
      ...o, meal_items: o.meal_items.filter((i) => i.id !== itemId),
    })));
    await persist(supabase.from("meal_items").delete().eq("id", itemId));
  }

  function delTitle() {
    if (confirmDel?.kind === "day") return "Poistetaanko päivä?";
    if (confirmDel?.kind === "meal") return "Poistetaanko ateria?";
    return "Poistetaanko vaihtoehto?";
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          onClick={() => router.push("/coach/meal-plans")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Ruokaohjelmat
        </button>
        <div className="flex items-center gap-3">
          <SaveStatus status={status} />
          {plan.is_template && (
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
              <Users className="h-4 w-4" /> Anna asiakkaalle
            </Button>
          )}
        </div>
      </div>

      <Input
        defaultValue={plan.title}
        onBlur={(e) => e.target.value !== plan.title && saveTitle(e.target.value)}
        className="mb-6 h-auto border-0 px-0 font-display text-2xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="space-y-6">
        {plan.meal_plan_days.map((day) => (
          <section key={day.id} className="rounded-2xl border bg-card p-4 md:p-5">
            <div className="flex items-center gap-2">
              <Input
                defaultValue={day.name ?? ""}
                onBlur={(e) => e.target.value !== (day.name ?? "") && renameDay(day.id, e.target.value)}
                className="h-9 flex-1 border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                placeholder="Päivä"
              />
              <KcalBadge kcal={dayMacros(day).kcal} accent />
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setConfirmDel({ kind: "day", dayId: day.id })} aria-label="Poista päivä">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="mt-1.5"><MacroChips m={dayMacros(day)} /></div>

            <div className="mt-4 space-y-2.5">
              {day.meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onRenameMeal={(name) => renameMeal(day.id, meal.id, name)}
                  onDeleteMeal={() => setConfirmDel({ kind: "meal", dayId: day.id, mealId: meal.id })}
                  onAddOption={() => addOption(day.id, meal)}
                  onRenameOption={(optionId, name) => renameOption(day.id, meal.id, optionId, name)}
                  onDeleteOption={(optionId) => setConfirmDel({ kind: "option", dayId: day.id, mealId: meal.id, optionId })}
                  onAddFood={(optionId) => setPickFor({ dayId: day.id, mealId: meal.id, optionId })}
                  onAmount={(optionId, itemId, amt) => updateAmount(day.id, meal.id, optionId, itemId, amt)}
                  onDeleteItem={(optionId, itemId) => deleteItem(day.id, meal.id, optionId, itemId)}
                />
              ))}
              {day.meals.length === 0 && <p className="py-2 text-sm text-muted-foreground">Ei vielä aterioita.</p>}
            </div>

            <Button variant="ghost" size="sm"
              className="mt-2 w-full border border-dashed text-muted-foreground hover:text-foreground"
              onClick={() => addMeal(day)}>
              <Plus className="h-4 w-4" /> Lisää ateria
            </Button>
          </section>
        ))}
      </div>

      <Button variant="outline" className="mt-6 w-full border-dashed" onClick={addDay}>
        <Plus className="h-4 w-4" /> Lisää päivä
      </Button>

      <p className="mt-8 text-[11px] text-muted-foreground">Ravintotiedot: THL / Fineli (CC BY 4.0)</p>

      <FoodSearchDialog
        open={pickFor !== null}
        onOpenChange={(v) => !v && setPickFor(null)}
        onPick={(food) => {
          if (pickFor) addItem(pickFor.dayId, pickFor.mealId, pickFor.optionId, food);
          setPickFor(null);
        }}
      />

      <ConfirmDialog
        open={confirmDel !== null}
        onOpenChange={(v) => !v && setConfirmDel(null)}
        title={delTitle()}
        description="Tätä ei voi perua."
        confirmLabel="Poista"
        onConfirm={() => {
          if (!confirmDel) return;
          if (confirmDel.kind === "day") deleteDay(confirmDel.dayId);
          else if (confirmDel.kind === "meal") deleteMeal(confirmDel.dayId, confirmDel.mealId);
          else deleteOption(confirmDel.dayId, confirmDel.mealId, confirmDel.optionId);
          setConfirmDel(null);
        }}
      />

      {plan.is_template && (
        <AssignMealPlanDialog open={assignOpen} onOpenChange={setAssignOpen} planId={plan.id} planTitle={plan.title} />
      )}
    </div>
  );
}

function MealCard({
  meal, onRenameMeal, onDeleteMeal, onAddOption, onRenameOption, onDeleteOption, onAddFood, onAmount, onDeleteItem,
}: {
  meal: MealRow;
  onRenameMeal: (name: string) => void;
  onDeleteMeal: () => void;
  onAddOption: () => void;
  onRenameOption: (optionId: string, name: string) => void;
  onDeleteOption: (optionId: string) => void;
  onAddFood: (optionId: string) => void;
  onAmount: (optionId: string, itemId: string, amount: number) => void;
  onDeleteItem: (optionId: string, itemId: string) => void;
}) {
  const multi = meal.meal_options.length > 1;
  const single = meal.meal_options[0];

  return (
    <div className="rounded-xl border bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={meal.name ?? ""}
          onBlur={(e) => e.target.value !== (meal.name ?? "") && onRenameMeal(e.target.value)}
          className="h-8 flex-1 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
          placeholder="Ateria"
        />
        {!multi && single && <KcalBadge kcal={optionMacros(single).kcal} />}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDeleteMeal} aria-label="Poista ateria">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Single option → items inline; multiple → sub-cards with names */}
      {!multi ? (
        single && (
          <ItemList
            option={single}
            onAddFood={() => onAddFood(single.id)}
            onAmount={(itemId, amt) => onAmount(single.id, itemId, amt)}
            onDeleteItem={(itemId) => onDeleteItem(single.id, itemId)}
          />
        )
      ) : (
        <div className="mt-2 space-y-2">
          {meal.meal_options.map((opt, i) => (
            <div key={opt.id} className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <Input
                  defaultValue={opt.name ?? ""}
                  onBlur={(e) => e.target.value !== (opt.name ?? "") && onRenameOption(opt.id, e.target.value)}
                  className="h-7 flex-1 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
                  placeholder={`Vaihtoehto ${i + 1}`}
                />
                <KcalBadge kcal={optionMacros(opt).kcal} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteOption(opt.id)} aria-label="Poista vaihtoehto">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              <ItemList
                option={opt}
                onAddFood={() => onAddFood(opt.id)}
                onAmount={(itemId, amt) => onAmount(opt.id, itemId, amt)}
                onDeleteItem={(itemId) => onDeleteItem(opt.id, itemId)}
              />
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="mt-2 h-8 px-2 text-muted-foreground hover:text-foreground" onClick={onAddOption}>
        <Copy className="h-3.5 w-3.5" /> Lisää vaihtoehto
      </Button>
    </div>
  );
}

function ItemList({
  option, onAddFood, onAmount, onDeleteItem,
}: {
  option: MealOption;
  onAddFood: () => void;
  onAmount: (itemId: string, amount: number) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  return (
    <>
      {option.meal_items.length > 0 && (
        <ul className="mt-2 divide-y divide-border/60">
          {option.meal_items.map((item) => {
            const m = itemMacros(item);
            return (
              <li key={item.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate text-sm capitalize">{item.food_name.toLowerCase()}</span>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    inputMode="numeric"
                    defaultValue={item.amount_g}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v) && v !== item.amount_g) onAmount(item.id, v);
                    }}
                    className="h-8 w-[4.5rem] pr-6 text-right tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-2 text-xs text-muted-foreground">g</span>
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{fmt(m.kcal)} kcal</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteItem(item.id)} aria-label="Poista ruoka-aine">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={onAddFood}>
          <Plus className="h-3.5 w-3.5" /> Ruoka-aine
        </Button>
        {option.meal_items.length > 0 && <MacroChips m={optionMacros(option)} />}
      </div>
    </>
  );
}

// ---- immutable nested update helpers ----
function mapDay(p: MealPlanFull, dayId: string, fn: (d: MealPlanDay) => MealPlanDay): MealPlanFull {
  return { ...p, meal_plan_days: p.meal_plan_days.map((d) => (d.id === dayId ? fn(d) : d)) };
}
function mapMeal(p: MealPlanFull, dayId: string, mealId: string, fn: (m: MealRow) => MealRow): MealPlanFull {
  return mapDay(p, dayId, (d) => ({ ...d, meals: d.meals.map((m) => (m.id === mealId ? fn(m) : m)) }));
}
function mapOption(p: MealPlanFull, dayId: string, mealId: string, optionId: string, fn: (o: MealOption) => MealOption): MealPlanFull {
  return mapMeal(p, dayId, mealId, (m) => ({ ...m, meal_options: m.meal_options.map((o) => (o.id === optionId ? fn(o) : o)) }));
}
