"use client";

import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getProgramFull, type ProgramFull, type ProgramExerciseRow } from "@/lib/queries/programs";
import { ChevronRight, Pencil, Dumbbell } from "lucide-react";
import { AssignProgramButton } from "@/components/program-builder/assign-program-button";

function setsLine(pe: ProgramExerciseRow): string {
  const cfgs = pe.set_configs && pe.set_configs.length > 0
    ? pe.set_configs
    : Array.from({ length: pe.sets ?? 0 }, () => ({ reps: pe.reps, weight: null, rpe: pe.target_rpe != null ? String(pe.target_rpe) : null }));
  if (cfgs.length === 0) return "—";
  const items = cfgs.map((c) => {
    const reps = c.reps ?? "?";
    const w = c.weight != null && String(c.weight).trim() !== "" ? `${c.weight}kg` : null;
    const rpe = c.rpe ? `@${c.rpe}` : null;
    return [reps, w, rpe].filter(Boolean).join(" ");
  });
  // Compress consecutive identical items as "N×item"
  const compressed: string[] = [];
  let cur = items[0] ?? "";
  let count = 1;
  for (let i = 1; i < items.length; i++) {
    if (items[i] === cur) count++;
    else {
      compressed.push(count > 1 ? `${count}×${cur}` : cur);
      cur = items[i] ?? "";
      count = 1;
    }
  }
  compressed.push(count > 1 ? `${count}×${cur}` : cur);
  return compressed.join(" · ");
}

function exercisesSummary(day: ProgramFull["program_blocks"][number]["program_weeks"][number]["program_days"][number]): {
  total: number;
  sets: number;
  names: string[];
} {
  let total = 0;
  let sets = 0;
  const names: string[] = [];
  for (const pe of day.program_exercises ?? []) {
    total += 1;
    const cfg = pe.set_configs && pe.set_configs.length > 0 ? pe.set_configs.length : (pe.sets ?? 0);
    sets += cfg;
    if (pe.exercises?.name) names.push(pe.exercises.name);
  }
  return { total, sets, names };
}

export function ProgramViewer({ programId, isTemplate }: { programId: string; isTemplate: boolean }) {
  const supabase = createClient();
  const { data: program } = useSuspenseQuery({
    queryKey: ["program", programId],
    queryFn: () => getProgramFull(supabase, programId),
  });

  const blocks = program.program_blocks ?? [];
  const totalWeeks = blocks.reduce((a, b) => a + (b.program_weeks?.length ?? 0), 0);
  const totalDays = blocks.reduce(
    (a, b) => a + (b.program_weeks ?? []).reduce((x, w) => x + (w.program_days?.length ?? 0), 0),
    0
  );

  return (
    <div className="flex flex-col">
      {/* Topbar */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <Link href="/coach/programs" className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
            Ohjelmat
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-semibold">{program.title}</span>
          {isTemplate && (
            <span className="ml-2 hidden shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 sm:inline-block dark:text-amber-400">
              Malli
            </span>
          )}
        </div>
        {isTemplate && <AssignProgramButton programId={programId} />}
        <Link
          href={`/coach/programs/${programId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Pencil className="h-3.5 w-3.5" />
          Muokkaa
        </Link>
      </div>

      <div className="p-3 md:p-6">
        {/* Stats banner */}
        {(program.description || blocks.length > 0) && (
          <div className="mb-5 rounded-2xl border bg-muted/30 p-4">
            {program.description && (
              <p className="text-sm leading-relaxed text-foreground/90">{program.description}</p>
            )}
            {blocks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span><b className="font-semibold text-foreground">{blocks.length}</b> jaksoa</span>
                <span><b className="font-semibold text-foreground">{totalWeeks}</b> viikkoa</span>
                <span><b className="font-semibold text-foreground">{totalDays}</b> treeniä</span>
              </div>
            )}
          </div>
        )}

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Dumbbell className="mb-4 h-10 w-10 opacity-30" />
            <p className="mb-1 text-base">Ohjelma on vielä tyhjä.</p>
            <Link
              href={`/coach/programs/${programId}/edit`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" /> Avaa muokkausnäkymä
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {blocks.map((block, bi) => (
              <BlockCard key={block.id} block={block} defaultOpen={bi === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockCard({
  block,
  defaultOpen,
}: {
  block: ProgramFull["program_blocks"][number];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const weeks = block.program_weeks ?? [];
  const dayCount = weeks.reduce((a, w) => a + (w.program_days?.length ?? 0), 0);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Jakso {block.block_number}
          </span>
          <span className="truncate text-sm font-semibold">
            {block.name?.trim() || `Jakso ${block.block_number}`}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {weeks.length} vk · {dayCount} treeniä
        </span>
      </button>
      {open && (
        <div className="border-t bg-muted/10 p-3 md:p-4">
          {weeks.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Ei viikkoja.</p>
          ) : (
            <div className="space-y-3">
              {weeks.map((week) => (
                <WeekCard key={week.id} week={week} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeekCard({
  week,
}: {
  week: ProgramFull["program_blocks"][number]["program_weeks"][number];
}) {
  const [open, setOpen] = useState(false);
  const days = week.program_days ?? [];
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] font-mono text-muted-foreground">VK{week.week_number}</span>
          <span className="truncate text-sm font-medium">
            {week.name?.trim() || `Viikko ${week.week_number}`}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {days.length} treeniä
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t p-2">
          {days.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">Ei treenejä.</p>
          ) : (
            days.map((day) => <DayCard key={day.id} day={day} />)
          )}
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
}: {
  day: ProgramFull["program_blocks"][number]["program_weeks"][number]["program_days"][number];
}) {
  const [open, setOpen] = useState(false);
  const sum = exercisesSummary(day);
  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] font-mono text-muted-foreground">T{day.day_number}</span>
          <span className="truncate text-sm font-medium">
            {day.name?.trim() || `Treeni ${day.day_number}`}
          </span>
          {!open && sum.names.length > 0 && (
            <span className="mt-0.5 truncate text-xs text-muted-foreground">
              {sum.names.slice(0, 3).join(" · ")}
              {sum.names.length > 3 ? ` · +${sum.names.length - 3}` : ""}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {sum.total} liikettä · {sum.sets} sarjaa
        </span>
      </button>
      {open && (
        <div className="border-t">
          {(day.program_exercises ?? []).length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Ei liikkeitä.</p>
          ) : (
            <ul className="divide-y">
              {(day.program_exercises ?? []).map((pe) => (
                <li key={pe.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {pe.exercises?.name ?? <span className="italic text-muted-foreground">Liike määrittämättä</span>}
                    </p>
                    {pe.notes && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{pe.notes}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {setsLine(pe)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
