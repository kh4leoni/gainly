"use client";

import { useState } from "react";
import { OhjelmaView } from "@/components/client/ohjelma-view";
import { ClientMealPlanView } from "@/components/client/meal-plan-view";
import type { MealPlanFull } from "@/lib/queries/meals";

const TABS = ["treeni", "ruoka"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { treeni: "Treeni", ruoka: "Ruokavalio" };

export function OhjelmaTabs({
  clientId,
  mealPlan,
}: {
  clientId: string;
  mealPlan: MealPlanFull | null;
}) {
  const [tab, setTab] = useState<Tab>("treeni");

  const segStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "7px 0",
    borderRadius: "var(--r-sm)",
    border: "none",
    background: active ? "var(--c-surface)" : "transparent",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    color: active ? "var(--c-text)" : "var(--c-text-muted)",
    transition: "all 0.15s",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
    fontFamily: "inherit",
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "8px 20px 4px" }}>
        <div style={{ display: "flex", background: "var(--c-surface2)", borderRadius: "var(--r-md)", padding: 3 }}>
          {TABS.map((t) => (
            <button key={t} style={segStyle(tab === t)} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === "treeni" ? (
        <OhjelmaView clientId={clientId} />
      ) : (
        <ClientMealPlanView plan={mealPlan} />
      )}
    </div>
  );
}
