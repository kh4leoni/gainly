"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchFoods, type Food } from "@/lib/queries/meals";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function FoodSearchDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (food: Food) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  // Debounced trigram search against the Fineli foods table.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchFoods(createClient(), q);
        if (id === seq.current) setResults(found);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Reset when closed so the next open starts clean.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lisää ruoka-aine</DialogTitle>
          <DialogDescription>Haku Finelin tietokannasta. Ravintoarvot per 100 g.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="esim. kaurahiutale, kana, banaani…"
            className="h-10 pl-9"
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && <p className="py-3 text-center text-sm text-muted-foreground">Haetaan…</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">Ei tuloksia.</p>
          )}
          <ul className="divide-y">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onPick(f)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{f.name_fi}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {f.energy_kcal != null ? `${Math.round(f.energy_kcal)} kcal` : "–"} / 100 g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground">Ravintotiedot: THL / Fineli (CC BY 4.0)</p>
      </DialogContent>
    </Dialog>
  );
}
