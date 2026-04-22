"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { LayoutList } from "lucide-react";

type Program = {
  id: string;
  title: string;
  description: string | null;
};

export function ProgramsList({ programs }: { programs: Program[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? programs.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : programs;

  return (
    <>
      <div className="mt-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hae ohjelmia…"
          className="h-10 w-full md:max-w-xs"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/coach/programs/${p.id}/edit`}
            prefetch
            className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-md active:scale-[0.99]"
            style={{ transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.025)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* gradient hover overlay */}
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgba(251,207,232,0.05) 100%)",
                transition: "opacity 280ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />

            <div className="relative">
              <p className="font-semibold leading-snug">{p.title}</p>
              {p.description && (
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              )}
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full mt-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <LayoutList className="h-10 w-10 opacity-20" />
            <p className="text-sm">{search ? "Ei hakutuloksia." : "Ei vielä ohjelmia."}</p>
          </div>
        )}
      </div>
    </>
  );
}
