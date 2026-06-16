"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updatePlan, defaultWeekLabel, type PlanFull, type PlanRow } from "@/lib/queries/plans";
import { ChevronLeft, Plus, X } from "lucide-react";

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

type Status = "idle" | "saving" | "saved" | "error";

export function PlanGrid({ initial }: { initial: PlanFull }) {
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState(initial.title);
  const [weekLabels, setWeekLabels] = useState<string[]>(initial.grid.weekLabels);
  const [rows, setRows] = useState<PlanRow[]>(initial.grid.rows);
  const [status, setStatus] = useState<Status>("idle");

  const weeks = weekLabels.length;
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Debounced autosave — every change schedules a write 700ms out.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await updatePlan(supabase, initial.id, { title, weeks: weekLabels.length, grid: { weekLabels, rows } });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [title, weekLabels, rows, supabase, initial.id]);

  // ── Mutators ──
  function setWeekLabel(i: number, v: string) {
    setWeekLabels((ws) => ws.map((w, idx) => (idx === i ? v : w)));
  }
  function setRowLabel(ri: number, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === ri ? { ...r, label: v } : r)));
  }
  function setCell(ri: number, ci: number, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === ri ? { ...r, cells: r.cells.map((c, k) => (k === ci ? v : c)) } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { id: uid(), exerciseId: null, label: "", cells: Array(weeks).fill("") }]);
  }
  function removeRow(ri: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== ri));
  }
  function addWeek() {
    setWeekLabels((ws) => [...ws, defaultWeekLabel(ws.length)]);
    setRows((rs) => rs.map((r) => ({ ...r, cells: [...r.cells, ""] })));
  }
  function removeWeek(ci: number) {
    if (weeks <= 1) return;
    setWeekLabels((ws) => ws.filter((_, idx) => idx !== ci));
    setRows((rs) => rs.map((r) => ({ ...r, cells: r.cells.filter((_, idx) => idx !== ci) })));
  }
  // Fill a week's value down to every row below (progression scaffold).
  function fillDown(ci: number, fromRow: number, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx >= fromRow ? { ...r, cells: r.cells.map((c, k) => (k === ci ? value : c)) } : r)));
  }

  // ── Spreadsheet keyboard nav (col 0 = label, 1..weeks = week cells) ──
  function focusCell(r: number, c: number) {
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`);
      if (el) {
        el.focus();
        el.select();
      }
    });
  }
  function onKey(e: ReactKeyboardEvent<HTMLInputElement>, r: number, c: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (r < rows.length - 1) focusCell(r + 1, c);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (r > 0) focusCell(r - 1, c);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (r >= rows.length - 1) addRow();
      focusCell(r + 1, c);
    } else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D") && c >= 1) {
      e.preventDefault();
      fillDown(c - 1, r, e.currentTarget.value);
    }
  }

  const cellClass =
    "h-9 w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition-colors hover:border-border focus:border-ring focus:bg-background";

  return (
    <div className="flex h-full min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
        <Link href="/coach/plans" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Takaisin">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Suunnitelman nimi"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-xl font-semibold outline-none transition-colors hover:border-border focus:border-ring focus:bg-card md:max-w-md"
        />
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {status === "saving" && "Tallennetaan…"}
          {status === "saved" && "✓ Tallennettu"}
          {status === "error" && "Virhe tallennuksessa"}
        </span>
      </div>

      {/* Hint */}
      <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground md:px-6">
        Raakile — luonnostele progressio vapaasti (esim. <span className="font-mono">3×8 80kg @7</span>). Näppäimet: ↑/↓ rivit · Tab sarakkeet · Enter alas · ⌘/Ctrl+D täytä alas.
      </div>

      {/* Grid */}
      <div ref={gridRef} className="flex-1 overflow-auto p-4 md:p-6">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background px-2 pb-1 text-left align-bottom">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Liike</span>
              </th>
              {weekLabels.map((wl, ci) => (
                <th key={ci} className="group px-1 pb-1 align-bottom">
                  <div className="flex items-center gap-1">
                    <input
                      value={wl}
                      onChange={(e) => setWeekLabel(ci, e.target.value)}
                      className="h-7 w-full min-w-[120px] rounded-md border border-transparent bg-muted/40 px-2 text-center text-xs font-semibold outline-none transition-colors hover:border-border focus:border-ring focus:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => removeWeek(ci)}
                      disabled={weeks <= 1}
                      title="Poista viikko"
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-1 pb-1 align-bottom">
                <button
                  type="button"
                  onClick={addWeek}
                  title="Lisää viikko"
                  className="flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-dashed px-2 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Viikko
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.id} className="group">
                <td className="sticky left-0 z-10 bg-background">
                  <div className="flex items-center gap-1">
                    <input
                      data-cell={`${ri}:0`}
                      value={r.label}
                      onChange={(e) => setRowLabel(ri, e.target.value)}
                      onKeyDown={(e) => onKey(e, ri, 0)}
                      placeholder="Liike…"
                      className="h-9 w-44 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none transition-colors hover:border-border focus:border-ring focus:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      title="Poista rivi"
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                {r.cells.map((cell, ci) => (
                  <td key={ci}>
                    <input
                      data-cell={`${ri}:${ci + 1}`}
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      onKeyDown={(e) => onKey(e, ri, ci + 1)}
                      placeholder="—"
                      className={cellClass}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 bg-background pt-1">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-dashed px-3 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  <Plus className="h-4 w-4" /> Liike
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Tyhjä suunnitelma. Lisää ensimmäinen liike yllä.</p>
        )}
      </div>
    </div>
  );
}
