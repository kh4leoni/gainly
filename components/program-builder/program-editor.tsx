"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProgramFull, type ProgramFull, type ProgramExerciseRow } from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, AlignLeft, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssignProgramButton } from "./assign-program-button";

type Block = ProgramFull["program_blocks"][number];
type Week = Block["program_weeks"][number];
type Day = Week["program_days"][number];
type SetConfig = { reps: string | null; weight: number | null; rpe: number | null };
type ExPatch = { id: string; sets?: number | null; reps?: string | null; intensity?: number | null; target_rpe?: number | null; target_rpes?: (number | null)[] | null; set_configs?: SetConfig[] | null; notes?: string | null };
type ExList = Array<{ id: string; name: string }>;

function isAutoDayName(name: string | null | undefined): boolean {
  if (!name) return true;
  return /^(päivä|day|treeni)\s*\d*$/i.test(name.trim());
}

function getNextMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Primitives ────────────────────────────────────────────────────────────────

function RpeStepper({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  function dec() {
    if (value === null) return;
    if (value <= 6) onChange(null);
    else onChange(+(value - 0.5).toFixed(1));
  }
  function inc() {
    if (value === null) onChange(6);
    else if (value < 10) onChange(+(value + 0.5).toFixed(1));
  }
  const label = value === null ? "—" : value < 6 ? "<6" : String(value);
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={dec}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted">−</button>
      <span className={cn("w-8 text-center text-[12.5px] font-medium tabular-nums", value !== null ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <button type="button" onClick={inc}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted">+</button>
    </div>
  );
}

// ── Per-set row inside ExerciseRow ────────────────────────────────────────────

function SetRow({ idx, cfg, onChange, onDelete, canDelete }: {
  idx: number; cfg: SetConfig;
  onChange: (c: SetConfig) => void;
  onDelete: () => void; canDelete: boolean;
}) {
  const repsNum = cfg.reps ? parseInt(cfg.reps, 10) : NaN;
  const showLabels = idx === 0;
  const inp = "h-[26px] w-10 rounded border border-border bg-muted/30 text-center text-[13px] font-medium outline-none focus:border-primary";
  const circleBtn = "flex h-[20px] w-[20px] items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground hover:bg-muted";

  return (
    <div className="grid grid-cols-[20px_auto_auto_auto_20px] items-end gap-3 px-3 py-1 pl-9">
      <span className="pb-[5px] text-[11px] font-bold text-muted-foreground/40">{idx + 1}</span>

      {/* Toistot */}
      <div className="flex flex-col gap-1">
        {showLabels && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Toistot</span>}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { if (!isNaN(repsNum) && repsNum > 1) onChange({ ...cfg, reps: String(repsNum - 1) }); }} className={circleBtn}>−</button>
          <input type="number" inputMode="numeric" placeholder="—"
            defaultValue={cfg.reps ?? ""} key={`reps-${idx}-${cfg.reps ?? ""}`}
            className={inp}
            onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== cfg.reps) onChange({ ...cfg, reps: v }); }} />
          <button type="button" onClick={() => onChange({ ...cfg, reps: String(isNaN(repsNum) ? 1 : repsNum + 1) })} className={circleBtn}>+</button>
        </div>
      </div>

      {/* Kuorma */}
      <div className="flex flex-col gap-1">
        {showLabels && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Kuorma</span>}
        <input type="number" inputMode="decimal" placeholder="—"
          defaultValue={cfg.weight ?? ""} key={`w-${idx}-${cfg.weight ?? ""}`}
          className="h-[26px] w-16 rounded border border-border bg-muted/30 px-1.5 text-center text-[13px] font-medium outline-none focus:border-primary"
          onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== cfg.weight) onChange({ ...cfg, weight: v }); }} />
      </div>

      {/* RPE */}
      <div className="flex flex-col gap-1">
        {showLabels && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">RPE</span>}
        <RpeStepper value={cfg.rpe} onChange={(v) => onChange({ ...cfg, rpe: v })} />
      </div>

      {/* Delete set */}
      <div className="pb-[3px]">
        <button type="button" onClick={onDelete} disabled={!canDelete}
          className={cn("flex items-center justify-center rounded p-0.5 transition-colors",
            canDelete ? "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10" : "invisible")}>
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DescriptionField({ id, value, onSave, placeholder }: {
  id: string; value: string | null; onSave: (v: string | null) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(!!value);
  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex items-center gap-1 text-xs font-medium transition-colors",
          open ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
        <AlignLeft className="h-3 w-3" />
        {open ? "Piilota kuvaus" : value ? "Näytä kuvaus" : "Lisää kuvaus"}
        <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <textarea
          key={`desc:${id}:${value ?? ""}`}
          className="w-full resize-none rounded border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
          rows={2} defaultValue={value ?? ""} placeholder={placeholder} autoFocus={!value}
          onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== value) onSave(v); }}
        />
      )}
    </div>
  );
}

// ── ExerciseRow ───────────────────────────────────────────────────────────────

function ExerciseRow({ pe, exercises, onUpdate, onAssign, onDelete }: {
  pe: ProgramExerciseRow; exercises: ExList;
  onUpdate: (patch: ExPatch) => void; onAssign: (exerciseId: string) => void; onDelete: () => void;
}) {
  const [showNotes, setShowNotes] = useState(!!pe.notes);
  const [picking, setPicking] = useState(false);
  const exerciseName = (pe.exercises as { name: string } | null)?.name ?? null;

  // Initialise set_configs: prefer DB value, fall back to deriving from legacy fields
  const [configs, setConfigs] = useState<SetConfig[]>(() => {
    if (pe.set_configs && pe.set_configs.length > 0) return pe.set_configs;
    const count = pe.sets ?? 1;
    const rpes = pe.target_rpes ?? [];
    return Array.from({ length: count }, (_, i) => ({
      reps: pe.reps ?? null,
      weight: pe.intensity ?? null,
      rpe: rpes[i] ?? pe.target_rpe ?? null,
    }));
  });

  function saveConfigs(next: SetConfig[]) {
    setConfigs(next);
    onUpdate({ id: pe.id, set_configs: next, sets: next.length });
  }

  function updateSet(i: number, c: SetConfig) {
    saveConfigs(configs.map((r, idx) => idx === i ? c : r));
  }

  function addSet() {
    const last = configs[configs.length - 1] ?? { reps: null, weight: null, rpe: null };
    saveConfigs([...configs, { ...last }]);
  }

  function removeSet(i: number) {
    if (configs.length <= 1) return;
    saveConfigs(configs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-[6px] border border-primary/20 bg-gradient-to-r from-primary/4 to-card">
      {/* Header: grip + name + delete */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="cursor-grab text-muted-foreground opacity-40 shrink-0"><GripVertical className="h-3.5 w-3.5" /></span>
        <div className="flex-1 min-w-0">
          {exerciseName && !picking
            ? <button type="button" onClick={() => setPicking(true)}
                className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-left hover:text-primary transition-colors cursor-pointer">
                {exerciseName}
              </button>
            : <ExerciseNamePicker exercises={exercises} onPick={(id) => { onAssign(id); setPicking(false); }} />}
        </div>
        <button type="button" onClick={onDelete}
          className="shrink-0 flex items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-[13px] w-[13px]" />
        </button>
      </div>

      {/* Set rows */}
      <div className="pb-1">
        {configs.map((cfg, i) => (
          <SetRow key={i} idx={i} cfg={cfg}
            onChange={(c) => updateSet(i, c)}
            onDelete={() => removeSet(i)}
            canDelete={configs.length > 1}
          />
        ))}
      </div>

      {/* Add set + notes */}
      <div className="flex items-center gap-3 border-t border-border/40 px-3 py-2 pl-9">
        <button type="button" onClick={addSet}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10">
          <Plus className="h-3 w-3" /> Lisää sarja
        </button>
        <button type="button" onClick={() => setShowNotes((o) => !o)}
          className={cn("ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors",
            showNotes ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
          <AlignLeft className="h-2.5 w-2.5" />
          {showNotes ? "Piilota ohje" : pe.notes ? "Näytä ohje" : "Lisää ohje"}
          <ChevronDown className={cn("h-2 w-2 transition-transform", showNotes && "rotate-180")} />
        </button>
      </div>
      {showNotes && (
        <div className="px-9 pb-2.5">
          <input key={`pe-notes:${pe.id}:${pe.notes ?? ""}`}
            className="block h-7 w-full rounded border border-border bg-muted/30 px-2 text-[12.5px] text-muted-foreground outline-none focus:border-primary"
            defaultValue={pe.notes ?? ""} placeholder="Ohje tai huomio valmentajalta…" autoFocus={!pe.notes}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== pe.notes) onUpdate({ id: pe.id, notes: v }); }} />
        </div>
      )}
    </div>
  );
}

// ── AddExerciseControl ────────────────────────────────────────────────────────

// Inline exercise picker — appears inside the exercise row when no exercise is assigned yet
function ExerciseNamePicker({ exercises, onPick }: { exercises: ExList; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises;

  useEffect(() => {
    inputRef.current?.focus();
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        className="h-[26px] w-48 rounded border border-primary/40 bg-background px-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        placeholder="Valitse liike…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filtered[0]) onPick(filtered[0].id);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-52 w-56 overflow-auto rounded-lg border border-border bg-background p-1 shadow-lg">
          {filtered.slice(0, 12).map((e) => (
            <li key={e.id}
              className="cursor-pointer rounded-[4px] px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(ev) => { ev.preventDefault(); onPick(e.id); }}>
              {e.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── WorkoutBlock (Treeni = program_day) ───────────────────────────────────────

function WorkoutBlock({ day, exercises, onUpdate, onDelete, onAddExercise, onAssignExercise, onUpdateExercise, onDeleteExercise }: {
  day: Day; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onDelete: () => void; onAddExercise: () => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const displayName = isAutoDayName(day.name) ? "" : (day.name ?? "");

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className={cn("flex items-center gap-2.5 bg-muted/20 px-3.5 py-2.5", !collapsed && "border-b border-border")}>
        <button type="button" onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <span className="min-w-[70px] shrink-0 text-[11px] font-bold uppercase tracking-widest text-primary">
          Treeni {day.day_number}
        </span>
        <input
          key={`day-name:${day.id}:${day.name ?? ""}`}
          defaultValue={displayName} placeholder="Nimeä tämä treeni…"
          className="h-[30px] flex-1 rounded border border-transparent bg-transparent px-2 text-[13.5px] font-medium text-foreground outline-none focus:border-border focus:bg-background"
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (displayName || null)) onUpdate({ name: v }); }}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onAddExercise}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10">
            <Plus className="h-3 w-3" /> Liike
          </button>
          <button type="button" onClick={onDelete}
            className="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-3 p-3.5">
          <DescriptionField id={`day-${day.id}`} value={day.description}
            onSave={(v) => onUpdate({ description: v })} placeholder="Treenin kuvaus tai ohjeet asiakkaalle…" />
          {(day.program_exercises ?? []).length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {(day.program_exercises ?? []).map((pe) => (
                <ExerciseRow key={pe.id} pe={pe} exercises={exercises}
                  onUpdate={onUpdateExercise}
                  onAssign={(exerciseId) => onAssignExercise(pe.id, exerciseId)}
                  onDelete={() => onDeleteExercise(pe.id)} />
              ))}
            </div>
          ) : (
            <p className="py-3 text-center text-sm text-muted-foreground">Lisää liike ylhäältä.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── WeekCard (Viikko = program_week) ──────────────────────────────────────────

function WeekCard({ week, exercises, onUpdate, onSetActive, onAddWorkout, onDelete,
  onUpdateDay, onDeleteDay, onAddExercise, onAssignExercise, onUpdateExercise, onDeleteExercise }: {
  week: Week; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onSetActive: () => void; onAddWorkout: () => void; onDelete: () => void;
  onUpdateDay: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteDay: (id: string) => void; onAddExercise: (dayId: string) => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card/50">
      <div className={cn(
        "flex items-center gap-2.5 bg-muted/20 px-4 py-3",
        "border-b border-border",
        collapsed ? "rounded-xl" : "rounded-t-xl"
      )}>
        <button type="button" onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="text-[13px] font-bold text-primary">Viikko {week.week_number}</span>
        <input
          key={`week-name:${week.id}:${week.name ?? ""}`}
          defaultValue={week.name ?? ""} placeholder="Viikon nimi (valinnainen)…"
          className="h-[28px] flex-1 rounded border border-transparent bg-transparent px-2 text-[13.5px] text-foreground outline-none focus:border-border focus:bg-background"
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== week.name) onUpdate({ name: v }); }}
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => { if (!week.is_active) onSetActive(); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all",
              week.is_active
                ? "cursor-default bg-emerald-500/15 text-emerald-500"
                : "bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", week.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
            {week.is_active ? "Aktiivinen" : "Ei aktiivinen"}
          </button>
          <button type="button" onClick={onAddWorkout}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10">
            <Plus className="h-3 w-3" /> Treeni
          </button>
          <button type="button"
            onClick={() => { if (window.confirm("Poistetaanko viikko ja kaikki sen treenit?")) onDelete(); }}
            className="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-3 p-4">
          <DescriptionField id={`week-${week.id}`} value={week.description}
            onSave={(v) => onUpdate({ description: v })} placeholder="Viikon kuvaus tai ohjeet asiakkaalle…" />
          {(week.program_days ?? []).length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Ei treenejä. Lisää treeni →</p>
          ) : (
            <div className="space-y-2.5">
              {(week.program_days ?? []).map((day) => (
                <WorkoutBlock
                  key={day.id} day={day} exercises={exercises}
                  onUpdate={(patch) => onUpdateDay({ id: day.id, ...patch })}
                  onDelete={() => onDeleteDay(day.id)}
                  onAddExercise={() => onAddExercise(day.id)}
                  onAssignExercise={onAssignExercise}
                  onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── BlockCard (Jakso = program_block) ─────────────────────────────────────────

function BlockCard({ block, exercises, onUpdate, onDelete, onAddWeek,
  onUpdateWeek, onDeleteWeek, onSetActiveWeek, onAddWorkout,
  onUpdateDay, onDeleteDay, onAddExercise, onAssignExercise, onUpdateExercise, onDeleteExercise }: {
  block: Block; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onDelete: () => void; onAddWeek: () => void;
  onUpdateWeek: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteWeek: (id: string) => void;
  onSetActiveWeek: (weekId: string) => void;
  onAddWorkout: (weekId: string) => void;
  onUpdateDay: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteDay: (id: string) => void; onAddExercise: (dayId: string) => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasActiveWeek = (block.program_weeks ?? []).some((w) => w.is_active);

  return (
    <div className={cn("rounded-2xl border bg-card", hasActiveWeek ? "border-primary/50" : "border-border")}>
      <div className={cn(
        "px-5 pb-3 pt-4 bg-muted/20",
        "border-b border-border",
        collapsed ? "rounded-2xl" : "rounded-t-2xl"
      )}>
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => setCollapsed((c) => !c)}
            className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground">
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <span className={cn("text-[11px] font-bold uppercase tracking-widest", hasActiveWeek ? "text-primary" : "text-muted-foreground")}>
              Jakso {block.block_number}
            </span>
            <input
              key={`block-name:${block.id}:${block.name ?? ""}`}
              defaultValue={block.name ?? ""} placeholder="Jakson nimi…"
              className={cn(
                "-ml-2 mt-0.5 block h-8 w-full rounded border border-transparent bg-transparent px-2 text-[17px] font-bold outline-none",
                "focus:border-border focus:bg-background focus:text-foreground",
                hasActiveWeek ? "text-primary/80" : "text-foreground"
              )}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== block.name) onUpdate({ name: v }); }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onAddWeek}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10">
              <Plus className="h-3 w-3" /> Viikko
            </button>
            <button type="button"
              onClick={() => { if (window.confirm("Poistetaanko jakso ja kaikki sen viikot ja treenit?")) onDelete(); }}
              className="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 pl-6">
          <DescriptionField id={`block-${block.id}`} value={block.description}
            onSave={(v) => onUpdate({ description: v })} placeholder="Jakson kuvaus tai tavoite asiakkaalle…" />
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-3 p-5">
          {(block.program_weeks ?? []).length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">Ei viikkoja. Lisää viikko →</p>
          ) : (
            (block.program_weeks ?? []).map((week) => (
              <WeekCard
                key={week.id} week={week} exercises={exercises}
                onUpdate={(patch) => onUpdateWeek({ id: week.id, ...patch })}
                onSetActive={() => onSetActiveWeek(week.id)}
                onAddWorkout={() => onAddWorkout(week.id)}
                onDelete={() => onDeleteWeek(week.id)}
                onUpdateDay={onUpdateDay} onDeleteDay={onDeleteDay}
                onAddExercise={onAddExercise} onAssignExercise={onAssignExercise}
                onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── ProgramEditor ─────────────────────────────────────────────────────────────

export function ProgramEditor({ programId }: { programId: string }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ["program", programId],
    queryFn: () => getProgramFull(supabase, programId),
  });
  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => getExercises(supabase),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["program", programId] });
  const [saveLabel, setSaveLabel] = useState("Tallenna");

  // ── Reschedule ──
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!program?.client_id) return;
      const { data: existing } = await supabase
        .from("scheduled_workouts").select("scheduled_date")
        .eq("program_id", programId).eq("client_id", program.client_id)
        .order("scheduled_date").limit(1).single();
      const startDate = existing?.scheduled_date ?? getNextMonday(new Date());
      const { error } = await supabase.rpc("schedule_program", {
        _program: programId, _client: program.client_id, _start_date: startDate,
      });
      if (error) throw error;
    },
  });

  async function handleSave() {
    if (rescheduleMutation.isPending) return;
    try { await rescheduleMutation.mutateAsync(); setSaveLabel("✓ Tallennettu!"); }
    catch { setSaveLabel("Virhe!"); }
    invalidate();
    setTimeout(() => setSaveLabel("Tallenna"), 1500);
  }

  // ── Block mutations ──
  const addBlock = useMutation({
    mutationFn: async () => {
      const next = (program?.program_blocks?.length ?? 0) + 1;
      const { error } = await supabase.from("program_blocks").insert({ program_id: programId, block_number: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateBlock = useMutation({
    mutationFn: async (patch: { id: string; name?: string | null; description?: string | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_blocks").update(rest).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        const b = next.program_blocks?.find((b) => b.id === patch.id);
        if (b) Object.assign(b, patch);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  // ── Week mutations ──
  const addWeek = useMutation({
    mutationFn: async (blockId: string) => {
      const block = program?.program_blocks?.find((b) => b.id === blockId);
      const next = (block?.program_weeks?.length ?? 0) + 1;
      const { error } = await supabase.from("program_weeks").insert({
        program_id: programId, block_id: blockId, week_number: next,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setActiveWeek = useMutation({
    mutationFn: async (weekId: string) => {
      const allWeeks = (program?.program_blocks ?? []).flatMap((b) => b.program_weeks ?? []);
      const { error: e1 } = await supabase.from("program_weeks").update({ is_active: false }).in("id", allWeeks.map((w) => w.id));
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("program_weeks").update({ is_active: true }).eq("id", weekId);
      if (e2) throw e2;
    },
    onMutate: async (weekId) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            w.is_active = w.id === weekId;
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const updateWeek = useMutation({
    mutationFn: async (patch: { id: string; name?: string | null; description?: string | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_weeks").update(rest).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? []) {
          const w = b.program_weeks?.find((w) => w.id === patch.id);
          if (w) Object.assign(w, patch);
        }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        next.program_blocks = next.program_blocks?.filter((b) => b.id !== id);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteWeek = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_weeks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          b.program_weeks = b.program_weeks?.filter((w) => w.id !== id);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  // ── Day mutations ──
  const addWorkout = useMutation({
    mutationFn: async (weekId: string) => {
      const allWeeks = (program?.program_blocks ?? []).flatMap((b) => b.program_weeks ?? []);
      const week = allWeeks.find((w) => w.id === weekId);
      const next = (week?.program_days?.length ?? 0) + 1;
      const { error } = await supabase.from("program_days").insert({ week_id: weekId, day_number: next, name: null });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateDay = useMutation({
    mutationFn: async (patch: { id: string; name?: string | null; description?: string | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_days").update(rest).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? []) {
            const d = w.program_days?.find((d) => d.id === patch.id);
            if (d) Object.assign(d, patch);
          }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteDay = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_days").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            w.program_days = w.program_days?.filter((d) => d.id !== id);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  // ── Exercise mutations ──
  const addExercise = useMutation({
    mutationFn: async ({ dayId }: { dayId: string }) => {
      const allDays = (program?.program_blocks ?? []).flatMap((b) => b.program_weeks ?? []).flatMap((w) => w.program_days ?? []);
      const day = allDays.find((d) => d.id === dayId);
      const next = day?.program_exercises?.length ?? 0;
      const { error } = await supabase.from("program_exercises").insert({
        day_id: dayId, exercise_id: null, order_idx: next,
        sets: 1, reps: null, intensity: null, intensity_type: null, target_rpe: null, rest_sec: null, notes: null,
        set_configs: [{ reps: null, weight: null, rpe: null }],
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateExercise = useMutation({
    mutationFn: async (patch: ExPatch) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("program_exercises").update(rest).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            for (const d of w.program_days ?? []) {
              const pe = d.program_exercises?.find((e) => e.id === patch.id);
              if (pe) Object.assign(pe, patch);
            }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const assignExercise = useMutation({
    mutationFn: async ({ peId, exerciseId }: { peId: string; exerciseId: string }) => {
      const { error } = await supabase.from("program_exercises")
        .update({ exercise_id: exerciseId, sets: 3, reps: "6" })
        .eq("id", peId);
      if (error) throw error;
    },
    onMutate: async ({ peId, exerciseId }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      const exData = exercises.find((e) => e.id === exerciseId);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            for (const d of w.program_days ?? []) {
              const pe = d.program_exercises?.find((e) => e.id === peId);
              if (pe) {
                pe.exercise_id = exerciseId;
                pe.sets = 3;
                pe.reps = "6";
                pe.exercises = exData
                  ? { id: exData.id, name: exData.name, video_path: null, instructions: null }
                  : null;
              }
            }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  if (!program) {
    return <div className="p-6"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;
  }

  return (
    <div className="flex flex-col">
      {/* Sticky topbar */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-6">
        <div className="flex flex-1 items-center gap-2 text-sm">
          <Link href="/coach/programs" className="text-muted-foreground transition-colors hover:text-foreground">
            Ohjelmat
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{program.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {program.is_template && <AssignProgramButton programId={programId} />}
          <button type="button" onClick={() => addBlock.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Lisää jakso
          </button>
          {!program.is_template && (
            <button type="button" onClick={handleSave} disabled={rescheduleMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {rescheduleMutation.isPending
                ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />Tallennetaan…</>
                : saveLabel}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        <div className="space-y-5">
          {(program.program_blocks ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Dumbbell className="mb-4 h-10 w-10 opacity-30" />
              <p className="mb-5 text-base">Ei jaksoja vielä.</p>
              <button type="button" onClick={() => addBlock.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                <Plus className="h-4 w-4" /> Lisää ensimmäinen jakso
              </button>
            </div>
          ) : (
            (program.program_blocks ?? []).map((block) => (
              <BlockCard
                key={block.id} block={block} exercises={exercises}
                onUpdate={(patch) => updateBlock.mutate({ id: block.id, ...patch })}
                onDelete={() => deleteBlock.mutate(block.id)}
                onAddWeek={() => addWeek.mutate(block.id)}
                onUpdateWeek={(patch) => updateWeek.mutate(patch)}
                onDeleteWeek={(id) => deleteWeek.mutate(id)}
                onSetActiveWeek={(weekId) => setActiveWeek.mutate(weekId)}
                onAddWorkout={(weekId) => addWorkout.mutate(weekId)}
                onUpdateDay={(patch) => updateDay.mutate(patch)}
                onDeleteDay={(id) => deleteDay.mutate(id)}
                onAddExercise={(dayId) => addExercise.mutate({ dayId })}
                onAssignExercise={(peId, exerciseId) => assignExercise.mutate({ peId, exerciseId })}
                onUpdateExercise={(patch) => updateExercise.mutate(patch)}
                onDeleteExercise={(id) => deleteExercise.mutate(id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
