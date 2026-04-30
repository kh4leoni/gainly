"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProgramFull, type ProgramFull, type ProgramExerciseRow } from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, AlignLeft, Dumbbell, Circle, TriangleAlert, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssignProgramButton } from "./assign-program-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDndMonitor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { UniqueIdentifier } from "@dnd-kit/core";

// React 19 compat — SortableContext children type mismatch
const SC = SortableContext as React.FC<{
  items: UniqueIdentifier[];
  strategy?: SortingStrategy;
  id?: string;
  children?: React.ReactNode;
}>;

type Block = ProgramFull["program_blocks"][number];
type Week = Block["program_weeks"][number];
type Day = Week["program_days"][number];
type SetConfig = { reps: string | null; weight: number | null; rpe: number | null };
type ExPatch = { id: string; sets?: number | null; reps?: string | null; intensity?: number | null; target_rpe?: number | null; target_rpes?: (number | null)[] | null; set_configs?: SetConfig[] | null; notes?: string | null };
type ExList = Array<{ id: string; name: string }>;
type DragHandleProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;

function isAutoDayName(name: string | null | undefined): boolean {
  if (!name) return true;
  return /^(päivä|day|treeni)\s*\d*$/i.test(name.trim());
}

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
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
      <span className={cn("w-6 text-center text-[12.5px] font-medium tabular-nums md:w-8", value !== null ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <button type="button" onClick={inc}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted">+</button>
    </div>
  );
}

function SetRow({ idx, cfg, onChange, onDelete, canDelete }: {
  idx: number; cfg: SetConfig;
  onChange: (c: SetConfig) => void;
  onDelete: () => void; canDelete: boolean;
}) {
  const repsNum = cfg.reps ? parseInt(cfg.reps, 10) : NaN;
  const showLabels = idx === 0;
  const inp = "h-[26px] w-9 rounded border border-border bg-muted/30 text-center text-[13px] font-medium outline-none focus:border-primary md:w-10";
  const circleBtn = "flex h-[20px] w-[20px] items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground hover:bg-muted";

  return (
    <div className="grid grid-cols-[16px_80px_52px_76px_20px] items-end gap-1.5 px-2 py-1 pl-3 md:grid-cols-[20px_96px_64px_84px_20px] md:gap-3 md:pl-9">
      <span className="pb-[5px] text-[11px] font-bold text-muted-foreground/40">{idx + 1}</span>
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
      <div className="flex flex-col gap-1">
        {showLabels && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Kuorma</span>}
        <input type="number" inputMode="decimal" placeholder="—"
          defaultValue={cfg.weight ?? ""} key={`w-${idx}-${cfg.weight ?? ""}`}
          className="h-[26px] w-12 rounded border border-border bg-muted/30 px-1.5 text-center text-[13px] font-medium outline-none focus:border-primary md:w-16"
          onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== cfg.weight) onChange({ ...cfg, weight: v }); }} />
      </div>
      <div className="flex flex-col gap-1">
        {showLabels && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">RPE</span>}
        <RpeStepper value={cfg.rpe} onChange={(v) => onChange({ ...cfg, rpe: v })} />
      </div>
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

function ExerciseRow({ pe, exercises, onUpdate, onAssign, onDelete, dragHandleProps }: {
  pe: ProgramExerciseRow; exercises: ExList;
  onUpdate: (patch: ExPatch) => void; onAssign: (exerciseId: string) => void; onDelete: () => void;
  dragHandleProps?: DragHandleProps;
}) {
  const [showNotes, setShowNotes] = useState(!!pe.notes);
  const [picking, setPicking] = useState(false);
  const exerciseName = (pe.exercises as { name: string } | null)?.name ?? null;

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
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span
          {...(dragHandleProps ?? {})}
          className="cursor-grab text-muted-foreground opacity-40 shrink-0 touch-none select-none"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
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
      <div className="pb-1">
        {configs.map((cfg, i) => (
          <SetRow key={i} idx={i} cfg={cfg}
            onChange={(c) => updateSet(i, c)}
            onDelete={() => removeSet(i)}
            canDelete={configs.length > 1}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-border/40 px-3 py-2 pl-3 md:pl-9">
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

function SortableExerciseRow(props: {
  pe: ProgramExerciseRow; exercises: ExList;
  onUpdate: (patch: ExPatch) => void; onAssign: (exerciseId: string) => void; onDelete: () => void;
  attributes: React.HTMLAttributes<HTMLElement>; listeners: React.HTMLAttributes<HTMLElement>;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes: slAttributes, listeners: slListeners } = useSortable({ id: props.pe.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const { attributes: _a, listeners: _l, ...rest } = props;
  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseRow {...rest} dragHandleProps={{ ...slAttributes, ...slListeners } as DragHandleProps} />
    </div>
  );
}

function WorkoutBlock({ day, exercises, onUpdate, onDelete, onAddExercise, onAssignExercise, onUpdateExercise, onDeleteExercise, onReorderExercises, dragHandleProps }: {
  day: Day; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onDelete: () => void; onAddExercise: () => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
  onReorderExercises: (dayId: string, orderedIds: string[]) => void;
  dragHandleProps?: DragHandleProps;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const displayName = isAutoDayName(day.name) ? "" : (day.name ?? "");
  const sensors = useDndSensors();

  function handleExerciseDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = day.program_exercises ?? [];
    const oldIdx = items.findIndex((e) => e.id === String(active.id));
    const newIdx = items.findIndex((e) => e.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onReorderExercises(day.id, arrayMove(items, oldIdx, newIdx).map((e) => e.id));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Poistetaanko treeni?"
        description="Kaikki treenin liikkeet poistetaan pysyvästi."
        onConfirm={onDelete}
        confirmLabel="Poista treeni"
      />
      <div className={cn("flex items-center gap-2 bg-muted/20 px-3 py-2.5", !collapsed && "border-b border-border")}>
        <span
          {...(dragHandleProps ?? {})}
          className="cursor-grab text-muted-foreground opacity-40 shrink-0 touch-none select-none"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <button type="button" onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-primary">
          Treeni {day.day_number}
        </span>
        <input
          key={`day-name:${day.id}:${day.name ?? ""}`}
          defaultValue={displayName} placeholder="Nimeä…"
          className="h-[30px] min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 text-[13.5px] font-medium text-foreground outline-none focus:border-border focus:bg-background"
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (displayName || null)) onUpdate({ name: v }); }}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onAddExercise}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10">
            <Plus className="h-3 w-3" /><span className="hidden md:inline">Liike</span>
          </button>
          <button type="button" onClick={() => setDeleteConfirm(true)}
            className="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-3 p-2 md:p-3.5">
          <DescriptionField id={`day-${day.id}`} value={day.description}
            onSave={(v) => onUpdate({ description: v })} placeholder="Treenin kuvaus tai ohjeet asiakkaalle…" />
          {(day.program_exercises ?? []).length > 0 ? (
            <DndContext id={`dnd-ex-${day.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
              <SC items={(day.program_exercises ?? []).map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div className="mt-3 space-y-1.5">
                  {(day.program_exercises ?? []).map((pe) => (
                    <SortableExerciseRow key={pe.id} pe={pe} exercises={exercises}
                      onUpdate={onUpdateExercise}
                      onAssign={(exerciseId) => onAssignExercise(pe.id, exerciseId)}
                      onDelete={() => onDeleteExercise(pe.id)}
                      attributes={{}} listeners={{}}
                    />
                  ))}
                </div>
              </SC>
            </DndContext>
          ) : (
            <p className="py-3 text-center text-sm text-muted-foreground">Lisää liike ylhäältä.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SortableWorkoutBlock(props: {
  day: Day; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onDelete: () => void; onAddExercise: () => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
  onReorderExercises: (dayId: string, orderedIds: string[]) => void;
  attributes: React.HTMLAttributes<HTMLElement>; listeners: React.HTMLAttributes<HTMLElement>;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes: slAttributes, listeners: slListeners } = useSortable({ id: props.day.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const { attributes: _a, listeners: _l, ...rest } = props;
  return (
    <div ref={setNodeRef} style={style}>
      <WorkoutBlock {...rest} dragHandleProps={{ ...slAttributes, ...slListeners } as DragHandleProps} />
    </div>
  );
}

function WeekCard({ week, exercises, onUpdate, onSetActive, onClearActive, onAddWorkout, onDelete, onDuplicate,
  onUpdateDay, onDeleteDay, onAddExercise, onAssignExercise, onUpdateExercise, onDeleteExercise,
  onReorderDays, onReorderExercises, dragHandleProps }: {
  week: Week; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onSetActive: () => void; onClearActive: () => void; onAddWorkout: () => void;
  onDelete: () => void; onDuplicate: () => void;
  onUpdateDay: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteDay: (id: string) => void; onAddExercise: (dayId: string) => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
  onReorderDays: (dayId: string, orderedIds: string[]) => void;
  onReorderExercises: (dayId: string, orderedIds: string[]) => void;
  dragHandleProps?: DragHandleProps;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [setActiveConfirm, setSetActiveConfirm] = useState(false);
  const [clearActiveConfirm, setClearActiveConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const sensors = useDndSensors();

  function handleDayDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const days = week.program_days ?? [];
    const oldIdx = days.findIndex((d) => d.id === String(active.id));
    const newIdx = days.findIndex((d) => d.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onReorderDays(week.id, arrayMove(days, oldIdx, newIdx).map((d) => d.id));
  }

  return (
    <div className="rounded-xl border border-border bg-card/50">
      <ConfirmDialog
        open={setActiveConfirm}
        onOpenChange={setSetActiveConfirm}
        title="Asetetaanko viikko aktiiviseksi?"
        description="Tämä viikko näytetään asiakkaan sovelluksessa. Aiempi aktiivinen viikko poistetaan käytöstä."
        onConfirm={onSetActive}
        confirmLabel="Aseta aktiiviseksi"
      />
      <ConfirmDialog
        open={clearActiveConfirm}
        onOpenChange={setClearActiveConfirm}
        title="Poista aktiivinen viikko?"
        description="Asiakkaan treeniohjelma ei enää näy sovelluksessa."
        onConfirm={onClearActive}
        confirmLabel="Poista aktiivisuus"
      />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Poistetaanko viikko?"
        description="Kaikki viikon treenit poistetaan pysyvästi."
        onConfirm={onDelete}
        confirmLabel="Poista viikko"
      />
      <div className={cn(
        "flex items-center gap-2 bg-muted/20 px-3 py-3",
        "border-b border-border",
        collapsed ? "rounded-xl" : "rounded-t-xl"
      )}>
        <span
          {...(dragHandleProps ?? {})}
          className="cursor-grab text-muted-foreground opacity-40 shrink-0 touch-none select-none"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <button type="button" onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="shrink-0 whitespace-nowrap text-[13px] font-bold text-primary">Viikko {week.week_number}</span>
        <input
          key={`week-name:${week.id}:${week.name ?? ""}`}
          defaultValue={week.name ?? ""} placeholder="Viikon nimi (valinnainen)…"
          className="h-[28px] min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 text-[13.5px] text-foreground outline-none focus:border-border focus:bg-background"
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== week.name) onUpdate({ name: v }); }}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {week.is_active ? (
            <button
              type="button"
              onClick={() => setClearActiveConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Aktiivinen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSetActiveConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-[12px] font-semibold text-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600"
            >
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span className="hidden md:inline">Aseta aktiiviseksi</span>
            </button>
          )}
          <button type="button" onClick={onDuplicate}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Copy className="h-3 w-3" /><span className="hidden md:inline">Monista</span>
          </button>
          <button type="button" onClick={onAddWorkout}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10">
            <Plus className="h-3 w-3" /><span className="hidden md:inline">Treeni</span>
          </button>
          <button type="button"
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-3 p-2 md:p-4">
          <DescriptionField id={`week-${week.id}`} value={week.description}
            onSave={(v) => onUpdate({ description: v })} placeholder="Viikon kuvaus tai ohjeet asiakkaalle…" />
          {(week.program_days ?? []).length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Ei treenejä. Lisää treeni →</p>
          ) : (
            <DndContext id={`dnd-days-${week.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDayDragEnd}>
              <SC items={(week.program_days ?? []).map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {(week.program_days ?? []).map((day) => (
                    <SortableWorkoutBlock
                      key={day.id} day={day} exercises={exercises}
                      onUpdate={(patch) => onUpdateDay({ id: day.id, ...patch })}
                      onDelete={() => onDeleteDay(day.id)}
                      onAddExercise={() => onAddExercise(day.id)}
                      onAssignExercise={onAssignExercise}
                      onUpdateExercise={onUpdateExercise}
                      onDeleteExercise={onDeleteExercise}
                      onReorderExercises={onReorderExercises}
                      attributes={{}} listeners={{}}
                    />
                  ))}
                </div>
              </SC>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

function SortableWeekCard(props: {
  week: Week; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onSetActive: () => void; onClearActive: () => void; onAddWorkout: () => void;
  onDelete: () => void; onDuplicate: () => void;
  onUpdateDay: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteDay: (id: string) => void; onAddExercise: (dayId: string) => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
  onReorderDays: (dayId: string, orderedIds: string[]) => void;
  onReorderExercises: (dayId: string, orderedIds: string[]) => void;
  attributes: React.HTMLAttributes<HTMLElement>; listeners: React.HTMLAttributes<HTMLElement>;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: props.week.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const { attributes: _, listeners: __, ...rest } = props;
  return (
    <div ref={setNodeRef} style={style}>
      <WeekCard {...rest} dragHandleProps={{ ...attributes, ...listeners } as DragHandleProps} />
    </div>
  );
}

function BlockCard({ block, exercises, onUpdate, onDelete, onAddWeek, onDuplicate, onDuplicateWeek,
  onUpdateWeek, onDeleteWeek, onSetActiveWeek, onClearActiveWeek, onAddWorkout,
  onUpdateDay, onDeleteDay, onAddExercise, onAssignExercise, onUpdateExercise, onDeleteExercise,
  onReorderWeeks, onReorderDays, onReorderExercises, dragHandleProps, forceCollapsed }: {
  block: Block; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onDelete: () => void; onAddWeek: () => void;
  onDuplicate: () => void; onDuplicateWeek: (weekId: string) => void;
  onUpdateWeek: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteWeek: (id: string) => void;
  onSetActiveWeek: (weekId: string) => void;
  onClearActiveWeek: () => void;
  onAddWorkout: (weekId: string) => void;
  onUpdateDay: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteDay: (id: string) => void; onAddExercise: (dayId: string) => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
  onReorderWeeks: (orderedIds: string[]) => void;
  onReorderDays: (weekId: string, orderedIds: string[]) => void;
  onReorderExercises: (dayId: string, orderedIds: string[]) => void;
  dragHandleProps?: DragHandleProps;
  forceCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = collapsed || !!forceCollapsed;
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const hasActiveWeek = (block.program_weeks ?? []).some((w) => w.is_active);
  const sensors = useDndSensors();

  function handleWeekDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const weeks = block.program_weeks ?? [];
    const oldIdx = weeks.findIndex((w) => w.id === String(active.id));
    const newIdx = weeks.findIndex((w) => w.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onReorderWeeks(arrayMove(weeks, oldIdx, newIdx).map((w) => w.id));
  }

  return (
    <div className={cn("rounded-2xl border bg-card", hasActiveWeek ? "border-primary/50" : "border-border")}>
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Poistetaanko jakso?"
        description="Kaikki jakson viikot ja treenit poistetaan pysyvästi."
        onConfirm={onDelete}
        confirmLabel="Poista jakso"
      />
      <div className={cn(
        "px-3 pb-3 pt-4 bg-muted/20 md:px-5",
        "border-b border-border",
        isCollapsed ? "rounded-2xl" : "rounded-t-2xl"
      )}>
        <div className="flex items-start gap-2">
          <span
            {...(dragHandleProps ?? {})}
            className="mt-1.5 cursor-grab text-muted-foreground opacity-40 shrink-0 touch-none select-none"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <button type="button" onClick={() => setCollapsed((c) => !c)}
            className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground">
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
          <div className="flex shrink-0 items-center gap-1 mt-1">
            <button type="button" onClick={onDuplicate}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:px-2.5">
              <Copy className="h-3.5 w-3.5" /><span className="hidden md:inline">Monista</span>
            </button>
            <button type="button" onClick={onAddWeek}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 md:px-2.5">
              <Plus className="h-3 w-3" /><span className="hidden md:inline">Viikko</span>
            </button>
            <button type="button"
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 pl-8">
          <DescriptionField id={`block-${block.id}`} value={block.description}
            onSave={(v) => onUpdate({ description: v })} placeholder="Jakson kuvaus tai tavoite asiakkaalle…" />
        </div>
      </div>
      {!isCollapsed && (
        <div className="space-y-3 p-5">
          {(block.program_weeks ?? []).length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">Ei viikkoja. Lisää viikko →</p>
          ) : (
            <DndContext id={`dnd-weeks-${block.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWeekDragEnd}>
              <SC items={(block.program_weeks ?? []).map((w) => w.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {(block.program_weeks ?? []).map((week) => (
                    <SortableWeekCard
                      key={week.id} week={week} exercises={exercises}
                      onUpdate={(patch) => onUpdateWeek({ id: week.id, ...patch })}
                      onSetActive={() => onSetActiveWeek(week.id)}
                      onClearActive={onClearActiveWeek}
                      onAddWorkout={() => onAddWorkout(week.id)}
                      onDelete={() => onDeleteWeek(week.id)}
                      onDuplicate={() => onDuplicateWeek(week.id)}
                      onUpdateDay={onUpdateDay} onDeleteDay={onDeleteDay}
                      onAddExercise={onAddExercise} onAssignExercise={onAssignExercise}
                      onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise}
                      onReorderDays={onReorderDays}
                      onReorderExercises={onReorderExercises}
                      attributes={{}} listeners={{}}
                    />
                  ))}
                </div>
              </SC>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

function SortableBlockCard(props: {
  block: Block; exercises: ExList;
  onUpdate: (patch: { name?: string | null; description?: string | null }) => void;
  onDelete: () => void; onAddWeek: () => void;
  onDuplicate: () => void; onDuplicateWeek: (weekId: string) => void;
  onUpdateWeek: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteWeek: (id: string) => void;
  onSetActiveWeek: (weekId: string) => void;
  onClearActiveWeek: () => void;
  onAddWorkout: (weekId: string) => void;
  onUpdateDay: (patch: { id: string; name?: string | null; description?: string | null }) => void;
  onDeleteDay: (id: string) => void; onAddExercise: (dayId: string) => void;
  onAssignExercise: (peId: string, exerciseId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void; onDeleteExercise: (id: string) => void;
  onReorderWeeks: (orderedIds: string[]) => void;
  onReorderDays: (weekId: string, orderedIds: string[]) => void;
  onReorderExercises: (dayId: string, orderedIds: string[]) => void;
  attributes: React.HTMLAttributes<HTMLElement>; listeners: React.HTMLAttributes<HTMLElement>;
  forceCollapsed?: boolean;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: props.block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const { attributes: _, listeners: __, ...rest } = props;
  return (
    <div ref={setNodeRef} style={style}>
      <BlockCard {...rest} dragHandleProps={{ ...attributes, ...listeners } as DragHandleProps} forceCollapsed={rest.forceCollapsed} />
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
  const [blockDragging, setBlockDragging] = useState(false);
  const sensors = useDndSensors();

  // ── Reschedule ──
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!program?.client_id) return;
      const { error } = await supabase.rpc("schedule_program", {
        _program: programId, _client: program.client_id,
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

  const reorderBlocks = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const r1 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_blocks").update({ block_number: 1000 + i }).eq("id", id)
      ));
      const e1 = r1.find((r) => r.error)?.error;
      if (e1) throw e1;
      const r2 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_blocks").update({ block_number: i + 1 }).eq("id", id)
      ));
      const e2 = r2.find((r) => r.error)?.error;
      if (e2) throw e2;
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        const blockMap = new Map((next.program_blocks ?? []).map((b) => [b.id, b] as const));
        next.program_blocks = orderedIds.flatMap((id, i) => {
          const b = blockMap.get(id);
          return b ? [{ ...b, block_number: i + 1 }] : [];
        });
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const duplicateBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const block = program?.program_blocks?.find((b) => b.id === blockId);
      if (!block) throw new Error("Block not found");
      const newBlockNumber = (program?.program_blocks?.length ?? 0) + 1;
      const { data: newBlock, error: blockErr } = await supabase
        .from("program_blocks")
        .insert({ program_id: programId, block_number: newBlockNumber, name: block.name ? `${block.name} (kopio)` : null, description: block.description })
        .select("id").single();
      if (blockErr) throw blockErr;
      for (const week of block.program_weeks ?? []) {
        const { data: newWeek, error: weekErr } = await supabase
          .from("program_weeks")
          .insert({ program_id: programId, block_id: newBlock.id, week_number: week.week_number, name: week.name, description: week.description, is_active: false })
          .select("id").single();
        if (weekErr) throw weekErr;
        for (const day of week.program_days ?? []) {
          const { data: newDay, error: dayErr } = await supabase
            .from("program_days")
            .insert({ week_id: newWeek.id, day_number: day.day_number, name: day.name, description: day.description })
            .select("id").single();
          if (dayErr) throw dayErr;
          const pes = day.program_exercises ?? [];
          if (pes.length > 0) {
            const { error: exErr } = await supabase.from("program_exercises").insert(
              pes.map((pe) => ({
                day_id: newDay.id, exercise_id: pe.exercise_id, order_idx: pe.order_idx,
                sets: pe.sets, reps: pe.reps, intensity: pe.intensity, intensity_type: pe.intensity_type,
                target_rpe: pe.target_rpe, target_rpes: pe.target_rpes, set_configs: pe.set_configs,
                rest_sec: pe.rest_sec, notes: pe.notes,
              }))
            );
            if (exErr) throw exErr;
          }
        }
      }
    },
    onSuccess: invalidate,
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

  const clearActiveWeek = useMutation({
    mutationFn: async () => {
      const allWeeks = (program?.program_blocks ?? []).flatMap((b) => b.program_weeks ?? []);
      const { error } = await supabase.from("program_weeks").update({ is_active: false }).in("id", allWeeks.map((w) => w.id));
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            w.is_active = false;
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const reorderWeeks = useMutation({
    mutationFn: async ({ blockId: _blockId, orderedIds }: { blockId: string; orderedIds: string[] }) => {
      const r1 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_weeks").update({ week_number: 1000 + i }).eq("id", id)
      ));
      const e1 = r1.find((r) => r.error)?.error;
      if (e1) throw e1;
      const r2 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_weeks").update({ week_number: i + 1 }).eq("id", id)
      ));
      const e2 = r2.find((r) => r.error)?.error;
      if (e2) throw e2;
    },
    onMutate: async ({ blockId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        const block = next.program_blocks?.find((b) => b.id === blockId);
        if (block) {
          const weekMap = new Map((block.program_weeks ?? []).map((w) => [w.id, w] as const));
          block.program_weeks = orderedIds.flatMap((id, i) => {
            const w = weekMap.get(id);
            return w ? [{ ...w, week_number: i + 1 }] : [];
          });
        }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const duplicateWeek = useMutation({
    mutationFn: async ({ weekId, blockId }: { weekId: string; blockId: string }) => {
      const block = program?.program_blocks?.find((b) => b.id === blockId);
      const week = block?.program_weeks?.find((w) => w.id === weekId);
      if (!week) throw new Error("Week not found");
      const newWeekNumber = (block?.program_weeks?.length ?? 0) + 1;
      const { data: newWeek, error: weekErr } = await supabase
        .from("program_weeks")
        .insert({ program_id: programId, block_id: blockId, week_number: newWeekNumber, name: week.name ? `${week.name} (kopio)` : null, description: week.description, is_active: false })
        .select("id").single();
      if (weekErr) throw weekErr;
      for (const day of week.program_days ?? []) {
        const { data: newDay, error: dayErr } = await supabase
          .from("program_days")
          .insert({ week_id: newWeek.id, day_number: day.day_number, name: day.name, description: day.description })
          .select("id").single();
        if (dayErr) throw dayErr;
        const pes = day.program_exercises ?? [];
        if (pes.length > 0) {
          const { error: exErr } = await supabase.from("program_exercises").insert(
            pes.map((pe) => ({
              day_id: newDay.id, exercise_id: pe.exercise_id, order_idx: pe.order_idx,
              sets: pe.sets, reps: pe.reps, intensity: pe.intensity, intensity_type: pe.intensity_type,
              target_rpe: pe.target_rpe, target_rpes: pe.target_rpes, set_configs: pe.set_configs,
              rest_sec: pe.rest_sec, notes: pe.notes,
            }))
          );
          if (exErr) throw exErr;
        }
      }
    },
    onSuccess: invalidate,
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

  const reorderDays = useMutation({
    mutationFn: async ({ weekId: _weekId, orderedIds }: { weekId: string; orderedIds: string[] }) => {
      const r1 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_days").update({ day_number: 1000 + i }).eq("id", id)
      ));
      const e1 = r1.find((r) => r.error)?.error;
      if (e1) throw e1;
      const r2 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_days").update({ day_number: i + 1 }).eq("id", id)
      ));
      const e2 = r2.find((r) => r.error)?.error;
      if (e2) throw e2;
    },
    onMutate: async ({ weekId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? []) {
          const week = b.program_weeks?.find((w) => w.id === weekId);
          if (week) {
            const dayMap = new Map((week.program_days ?? []).map((d) => [d.id, d] as const));
            week.program_days = orderedIds.flatMap((id, i) => {
              const d = dayMap.get(id);
              return d ? [{ ...d, day_number: i + 1 }] : [];
            });
            break;
          }
        }
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

  const reorderExercises = useMutation({
    mutationFn: async ({ dayId: _dayId, orderedIds }: { dayId: string; orderedIds: string[] }) => {
      const r1 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_exercises").update({ order_idx: 1000 + i }).eq("id", id)
      ));
      const e1 = r1.find((r) => r.error)?.error;
      if (e1) throw e1;
      const r2 = await Promise.all(orderedIds.map((id, i) =>
        supabase.from("program_exercises").update({ order_idx: i }).eq("id", id)
      ));
      const e2 = r2.find((r) => r.error)?.error;
      if (e2) throw e2;
    },
    onMutate: async ({ dayId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? []) {
            const day = w.program_days?.find((d) => d.id === dayId);
            if (day) {
              const peMap = new Map((day.program_exercises ?? []).map((e) => [e.id, e] as const));
              day.program_exercises = orderedIds.flatMap((id, i) => {
                const e = peMap.get(id);
                return e ? [{ ...e, order_idx: i }] : [];
              });
              break;
            }
          }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const blocks = program?.program_blocks ?? [];
    const oldIdx = blocks.findIndex((b) => b.id === String(active.id));
    const newIdx = blocks.findIndex((b) => b.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    reorderBlocks.mutate(arrayMove(blocks, oldIdx, newIdx).map((b) => b.id));
  }

  if (!program) {
    return <div className="p-6"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;
  }

  const hasActiveWeek = (program.program_blocks ?? [])
    .flatMap((b) => b.program_weeks ?? [])
    .some((w) => w.is_active);

  return (
    <div className="flex flex-col">
      {/* Sticky topbar */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:gap-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <Link href="/coach/programs" className="hidden shrink-0 text-muted-foreground transition-colors hover:text-foreground md:block">
            Ohjelmat
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground md:block" />
          <span className="truncate font-semibold">{program.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {program.is_template && <AssignProgramButton programId={programId} />}
          <button type="button" onClick={() => addBlock.mutate()}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted md:gap-1.5 md:px-3">
            <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Lisää </span>jakso
          </button>
          {!program.is_template && (
            <button type="button" onClick={handleSave} disabled={rescheduleMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 md:px-4">
              {rescheduleMutation.isPending
                ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />Tallennetaan…</>
                : saveLabel}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-6">
        <div className="space-y-5">
          {!hasActiveWeek && (program.program_blocks ?? []).length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <span className="font-semibold">Ei aktiivista viikkoa.</span>{" "}
                Asiakkaan treeniohjelma ei näy ennen kuin valitset aktiivisen viikon alta.
              </p>
            </div>
          )}
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
            <DndContext id={`dnd-blocks-${programId}`} sensors={sensors} collisionDetection={closestCenter}
              onDragStart={() => flushSync(() => setBlockDragging(true))}
              onDragEnd={(e) => { setBlockDragging(false); handleBlockDragEnd(e); }}
              onDragCancel={() => setBlockDragging(false)}
            >
              <SC items={(program.program_blocks ?? []).map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-5">
                  {(program.program_blocks ?? []).map((block) => (
                    <SortableBlockCard
                      key={block.id} block={block} exercises={exercises}
                      onUpdate={(patch) => updateBlock.mutate({ id: block.id, ...patch })}
                      onDelete={() => deleteBlock.mutate(block.id)}
                      onAddWeek={() => addWeek.mutate(block.id)}
                      onDuplicate={() => duplicateBlock.mutate(block.id)}
                      onDuplicateWeek={(weekId) => duplicateWeek.mutate({ weekId, blockId: block.id })}
                      onUpdateWeek={(patch) => updateWeek.mutate(patch)}
                      onDeleteWeek={(id) => deleteWeek.mutate(id)}
                      onSetActiveWeek={(weekId) => setActiveWeek.mutate(weekId)}
                      onClearActiveWeek={() => clearActiveWeek.mutate()}
                      onAddWorkout={(weekId) => addWorkout.mutate(weekId)}
                      onUpdateDay={(patch) => updateDay.mutate(patch)}
                      onDeleteDay={(id) => deleteDay.mutate(id)}
                      onAddExercise={(dayId) => addExercise.mutate({ dayId })}
                      onAssignExercise={(peId, exerciseId) => assignExercise.mutate({ peId, exerciseId })}
                      onUpdateExercise={(patch) => updateExercise.mutate(patch)}
                      onDeleteExercise={(id) => deleteExercise.mutate(id)}
                      onReorderWeeks={(orderedIds) => reorderWeeks.mutate({ blockId: block.id, orderedIds })}
                      onReorderDays={(weekId, orderedIds) => reorderDays.mutate({ weekId, orderedIds })}
                      onReorderExercises={(dayId, orderedIds) => reorderExercises.mutate({ dayId, orderedIds })}
                      forceCollapsed={blockDragging}
                      attributes={{}} listeners={{}}
                    />
                  ))}
                </div>
              </SC>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
