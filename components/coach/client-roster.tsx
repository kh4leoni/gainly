"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClientCard } from "@/components/coach/client-card";

export type RosterClient = {
  id: string;
  name: string;
  status: string;
  nextName: string | null;
  pendingCount: number;
  pendingLabel: string;
};

export function ClientRoster({ clients }: { clients: RosterClient[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query ? clients.filter((c) => c.name.toLowerCase().includes(query)) : clients;

  return (
    <div className="card-enter card-enter-2">
      <div className="relative mt-4 md:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hae asiakkaita…"
          className="h-10 w-full pl-9"
          aria-label="Hae asiakkaita"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Ei hakutuloksia haulle “{q.trim()}”.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              id={c.id}
              name={c.name}
              status={c.status}
              nextName={c.nextName}
              pendingCount={c.pendingCount}
              pendingLabel={c.pendingLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
