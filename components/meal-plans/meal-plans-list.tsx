"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed } from "lucide-react";

type Plan = {
  id: string;
  title: string;
  description: string | null;
};

export function MealPlansList({ plans }: { plans: Plan[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? plans.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : plans;

  return (
    <>
      <div className="mt-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hae ruokaohjelmia…"
          className="h-10 w-full md:max-w-xs"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/coach/meal-plans/${p.id}/edit`}
            prefetch
            className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-md active:scale-[0.99]"
          >
            <p className="font-semibold leading-snug">{p.title}</p>
            {p.description && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
            )}
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full mt-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 opacity-20" />
            <p className="text-sm">{search ? "Ei hakutuloksia." : "Ei vielä ruokaohjelmia."}</p>
          </div>
        )}
      </div>
    </>
  );
}
