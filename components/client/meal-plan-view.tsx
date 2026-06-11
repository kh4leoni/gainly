"use client";

import { useState } from "react";
import {
  type MealPlanFull, type MealRow, type Macros,
  optionMacros, dayMacros,
} from "@/lib/queries/meals";
import { ForkKnife } from "@phosphor-icons/react";

const fmt = (n: number) => Math.round(n).toString();

const MACRO = {
  protein: { color: "#5EC8A8", label: "Proteiini" },
  carb: { color: "#E0A458", label: "Hiilihydr." },
  fat: { color: "#8B92E8", label: "Rasva" },
} as const;

function calorieSplit(m: Macros) {
  const p = m.protein * 4;
  const c = m.carb * 4;
  const f = m.fat * 9;
  return { p, c, f, total: p + c + f };
}

function MacroBar({ m }: { m: Macros }) {
  const { p, c, f, total } = calorieSplit(m);
  if (total <= 0) return <div style={{ height: 8, borderRadius: 99, background: "var(--c-surface3)" }} />;
  const seg = (v: number, color: string) =>
    v > 0 ? <span style={{ width: `${(v / total) * 100}%`, background: color }} /> : null;
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 2 }}>
      {seg(p, MACRO.protein.color)}
      {seg(c, MACRO.carb.color)}
      {seg(f, MACRO.fat.color)}
    </div>
  );
}

function MacroCol({ macro, grams, pct }: { macro: typeof MACRO[keyof typeof MACRO]; grams: number; pct: number | null }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: macro.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3px", color: "var(--c-text-muted)", textTransform: "uppercase" }}>
          {macro.label}
        </span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--c-text)", letterSpacing: "-0.4px" }}>
        {fmt(grams)}<span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text-subtle)" }}> g</span>
      </div>
      {pct !== null && <div style={{ fontSize: 10, color: "var(--c-text-subtle)", fontWeight: 600 }}>{pct}%</div>}
    </div>
  );
}

function DayHero({ m }: { m: Macros }) {
  const { p, c, f, total } = calorieSplit(m);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : null);
  return (
    <div
      className="card-enter"
      style={{
        borderRadius: "var(--r-2xl)", border: "1px solid var(--c-border)",
        background: "linear-gradient(160deg, var(--c-surface2) 0%, var(--c-surface) 70%)",
        padding: "18px 18px 16px", position: "relative", overflow: "hidden",
      }}
    >
      <span aria-hidden style={{ position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", background: "var(--c-pink-glow)", filter: "blur(40px)", opacity: 0.5, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--c-text-subtle)", marginBottom: 4 }}>
          Päivä yhteensä
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-1.5px", color: "var(--c-text)", lineHeight: 1 }}>{fmt(m.kcal)}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text-muted)" }}>kcal</span>
        </div>
        <MacroBar m={m} />
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <MacroCol macro={MACRO.protein} grams={m.protein} pct={pct(p)} />
          <MacroCol macro={MACRO.carb} grams={m.carb} pct={pct(c)} />
          <MacroCol macro={MACRO.fat} grams={m.fat} pct={pct(f)} />
        </div>
      </div>
    </div>
  );
}

function MealCard({
  meal, index, selectedIdx, onSelect,
}: {
  meal: MealRow;
  index: number;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const options = meal.meal_options;
  const multi = options.length > 1;
  const idx = Math.min(selectedIdx, options.length - 1);
  const option = options[idx];
  const m = option ? optionMacros(option) : { kcal: 0, protein: 0, fat: 0, carb: 0 };

  return (
    <div
      className={`card-enter card-enter-${Math.min(index + 1, 6)}`}
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: "13px 15px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-0.2px" }}>{meal.name ?? "Ateria"}</p>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", background: "var(--c-surface2)", padding: "3px 9px", borderRadius: "var(--r-pill)", flexShrink: 0 }}>
          {fmt(m.kcal)} kcal
        </span>
      </div>

      {/* Option selector — only when there's a real choice */}
      {multi && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 11 }}>
          {options.map((opt, i) => {
            const selected = i === idx;
            const okcal = optionMacros(opt).kcal;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={selected}
                style={{
                  flex: "1 1 auto", minWidth: 0, padding: "7px 10px", borderRadius: "var(--r-md)",
                  border: `1px solid ${selected ? "color-mix(in srgb, var(--c-pink) 40%, transparent)" : "var(--c-border)"}`,
                  background: selected ? "var(--c-pink-dim)" : "var(--c-surface2)",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: selected ? "var(--c-pink)" : "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {opt.name ?? `Vaihtoehto ${i + 1}`}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--c-text-muted)", marginTop: 1 }}>{fmt(okcal)} kcal</div>
              </button>
            );
          })}
        </div>
      )}

      {option && option.meal_items.length > 0 ? (
        <ul style={{ display: "flex", flexDirection: "column" }}>
          {option.meal_items.map((item, i) => (
            <li
              key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid var(--c-border)" }}
            >
              <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "var(--c-text)", textTransform: "capitalize" }}>
                {item.food_name.toLowerCase()}
              </span>
              <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: "var(--c-text-muted)" }}>{fmt(item.amount_g)} g</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 12, color: "var(--c-text-subtle)" }}>—</p>
      )}
    </div>
  );
}

export function ClientMealPlanView({ plan }: { plan: MealPlanFull | null }) {
  const days = plan?.meal_plan_days ?? [];
  const [dayIdx, setDayIdx] = useState(0);
  // meal.id → chosen option index. Missing = first option.
  const [selections, setSelections] = useState<Record<string, number>>({});

  if (!plan || days.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: "48px 32px", color: "var(--c-text-muted)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--c-surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ForkKnife size={28} weight="duotone" color="var(--c-text-subtle)" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", marginBottom: 4 }}>Ei ruokaohjelmaa vielä</p>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>Valmentaja laatii ruokaohjelmasi pian. Tämä näkymä päivittyy automaattisesti.</p>
        </div>
      </div>
    );
  }

  const day = days[Math.min(dayIdx, days.length - 1)]!;

  return (
    <div style={{ flex: 1, padding: "4px 20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      {plan.description && (
        <p style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.5 }}>{plan.description}</p>
      )}

      {days.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", margin: "0 -20px", padding: "0 20px 2px" }}>
          {days.map((d, i) => {
            const selected = i === dayIdx;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDayIdx(i)}
                aria-pressed={selected}
                style={{
                  flexShrink: 0, padding: "8px 15px", borderRadius: "var(--r-pill)",
                  border: `1px solid ${selected ? "color-mix(in srgb, var(--c-pink) 35%, transparent)" : "var(--c-border)"}`,
                  background: selected ? "var(--c-pink-dim)" : "var(--c-surface)",
                  color: selected ? "var(--c-pink)" : "var(--c-text-muted)",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: "0.2px", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {d.name ?? `Päivä ${d.day_number}`}
              </button>
            );
          })}
        </div>
      )}

      <DayHero key={`hero-${day.id}`} m={dayMacros(day, selections)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {day.meals.map((meal, i) => (
          <MealCard
            key={meal.id}
            meal={meal}
            index={i}
            selectedIdx={selections[meal.id] ?? 0}
            onSelect={(idx) => setSelections((s) => ({ ...s, [meal.id]: idx }))}
          />
        ))}
        {day.meals.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--c-text-subtle)", textAlign: "center", padding: "20px 0" }}>
            Ei aterioita tälle päivälle.
          </p>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--c-text-subtle)", marginTop: 2 }}>Ravintotiedot: THL / Fineli (CC BY 4.0)</p>
    </div>
  );
}
