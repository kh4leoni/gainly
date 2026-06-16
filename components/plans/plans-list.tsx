"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Table2 } from "lucide-react";
import type { PlanListItem } from "@/lib/queries/plans";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
}

export function PlansList({ plans }: { plans: PlanListItem[] }) {
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
          placeholder="Hae suunnitelmia…"
          className="h-10 w-full md:max-w-xs"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/coach/plans/${p.id}`}
            prefetch
            className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-md active:scale-[0.99]"
            style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.025)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(192,38,211,0.05) 100%)",
                transition: "opacity 280ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
            <div className="relative">
              <p className="font-semibold leading-snug">{p.title || "Nimetön suunnitelma"}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {p.weeks} viikkoa · muokattu {fmtDate(p.updated_at)}
              </p>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full mt-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <Table2 className="h-10 w-10 opacity-20" />
            <p className="text-sm">{search ? "Ei hakutuloksia." : "Ei vielä suunnitelmia. Luo ensimmäinen yllä."}</p>
          </div>
        )}
      </div>
    </>
  );
}
