"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getProgramFull,
  getProgramCompletion,
  type ProgramFull,
  type ProgramExerciseRow,
  type ProgramCompletion,
  type CompletedSet,
} from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
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

// React 19 children-type compat
const SC = SortableContext as React.FC<{
  items: UniqueIdentifier[];
  strategy?: SortingStrategy;
  id?: string;
  children?: React.ReactNode;
}>;

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

// Narrow-viewport flag. The editor switches from the side-by-side master-detail
// rail to a single-pane (list ↔ detail) flow below this width so it stays usable
// on phones, where the 320px rail + detail can't sit side by side.
function useIsMobile(maxWidth = 820) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [maxWidth]);
  return mobile;
}
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  GripVertical,
  History,
  Pencil,
  Plus,
  Settings2,
  X,
  ArrowUpRight,
  ClipboardList,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Block = ProgramFull["program_blocks"][number];
type Week = Block["program_weeks"][number];
type Day = Week["program_days"][number];
// reps, weight and rpe are free-text so a coach can prescribe ranges
// ("10-12", "160-170", "6-7"). Clients still log a single value; ranges are
// target hints only. Legacy rows may carry a numeric weight — render/parse
// paths tolerate that via String()/rangeBounds.
type SetConfig = { reps: string | null; weight: string | null; rpe: string | null };
type ExPatch = {
  id: string;
  sets?: number | null;
  reps?: string | null;
  intensity?: number | null;
  target_rpe?: number | null;
  target_rpes?: (number | null)[] | null;
  set_configs?: SetConfig[] | null;
  notes?: string | null;
  free_text?: string | null;
  target_distance_m?: number | null;
  target_duration_s?: number | null;
  target_hr_bpm?: number | null;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
// Tokens live in CSS (see Mv2Style) so they can flip with html.light/.dark.
// Subcomponents reference them via `var(--bg-0)` etc., so nothing needs to
// know about the active theme.

// Day-1 colour is driven by CSS vars so it can follow the co-brand rule:
// neutral blue by default, Gainly rose only under html.gainly-cobrand (see
// Mv2Style). Days 2–4 are fixed identity hues (no pink involved).
const COLORS = {
  day1: { fg: "var(--day1-fg)", bg: "var(--day1-bg)", line: "var(--day1-line)" },
  amber: { fg: "#F2B872", bg: "rgba(242,184,114,0.10)", line: "rgba(242,184,114,0.35)" },
  violet: { fg: "#B69CFF", bg: "rgba(182,156,255,0.10)", line: "rgba(182,156,255,0.35)" },
  cyan: { fg: "#7BD3E5", bg: "rgba(123,211,229,0.10)", line: "rgba(123,211,229,0.35)" },
} as const;
type ColorKey = keyof typeof COLORS;
const COLOR_CYCLE: ColorKey[] = ["day1", "amber", "violet", "cyan"];

function dayColor(dayNumber: number): (typeof COLORS)[ColorKey] {
  const k = COLOR_CYCLE[(dayNumber - 1) % COLOR_CYCLE.length] ?? "day1";
  return COLORS[k];
}

function dayBadge(d: Day): string {
  // 2-char badge. Use first 2 letters of name if present and meaningful, else T{n}.
  const n = (d.name ?? "").trim();
  if (n && !/^(päivä|day|treeni)\s*\d*$/i.test(n)) {
    return n.slice(0, 2).toUpperCase();
  }
  return `T${d.day_number}`;
}

function dayDisplayName(d: Day, fallback?: string): string {
  const n = (d.name ?? "").trim();
  if (n) return n;
  return fallback ?? `Treeni ${d.day_number}`;
}

// ── Helpers: sets/configs ─────────────────────────────────────────────────────

function configsFromExercise(pe: ProgramExerciseRow): SetConfig[] {
  if (pe.set_configs && pe.set_configs.length > 0) return pe.set_configs;
  const count = pe.sets ?? 0;
  const rpes = pe.target_rpes ?? [];
  return Array.from({ length: count }, (_, i) => ({
    reps: pe.reps ?? null,
    weight: pe.intensity != null ? String(pe.intensity) : null,
    rpe: rpeToStr(rpes[i] ?? pe.target_rpe ?? null),
  }));
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

// Legacy numeric rpe → string for the unified range-capable field.
function rpeToStr(n: number | null | undefined): string | null {
  return n == null ? null : String(n);
}

// Numeric bounds parsed from a free-text range like "10-12" or "6-7" → [10,12].
// Single values ("8") → [8]. Empty/garbage → []. Tolerates legacy numeric
// values still present in older set_configs rows (rpe used to be a number).
function rangeBounds(s: string | number | null): number[] {
  if (s == null || s === "") return [];
  return String(s)
    .split("-")
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !Number.isNaN(n));
}

// Keep only digits, dot and a single dash; empty → null.
function normalizeRange(v: string): string | null {
  const t = v.replace(/[^\d.-]/g, "").trim();
  return t || null;
}

// Highest numeric value in a range like "160-170" (→170) or single "160" (→160).
// Used where a comparable scalar is needed (progression bars/delta). Empty → 0.
function weightTop(w: string | number | null): number {
  const b = rangeBounds(w);
  return b.length ? Math.max(...b) : 0;
}

// Summary range: collapses when all values are equal. Used in the Exercises
// column / neighbor cards where vertical space is tight.
function repsLabel(cfgs: SetConfig[]): string {
  if (cfgs.length === 0) return "—";
  const bounds = cfgs.flatMap((s) => rangeBounds(s.reps));
  if (bounds.length === 0) return `${cfgs.length}×—`;
  const min = Math.min(...bounds);
  const max = Math.max(...bounds);
  return min === max ? `${cfgs.length}×${min}` : `${cfgs.length}×${min}-${max}`;
}

function weightLabel(cfgs: SetConfig[]): string {
  const bounds = cfgs.flatMap((s) => rangeBounds(s.weight)).filter((w) => w > 0);
  if (bounds.length === 0) return "oma p.";
  const min = Math.min(...bounds);
  const max = Math.max(...bounds);
  return min === max ? `${fmtNum(min)}kg` : `${fmtNum(min)}-${fmtNum(max)}kg`;
}

function rpeLabel(cfgs: SetConfig[]): string {
  const bounds = cfgs.flatMap((s) => rangeBounds(s.rpe));
  if (bounds.length === 0) return "@—";
  const min = Math.min(...bounds);
  const max = Math.max(...bounds);
  return min === max ? `@${min}` : `@${min}-${max}`;
}

// Per-set inline summary used in phase-overview cells.
// Each set rendered as "{weight}kg @{rpe}" (or "{reps}×{weight}kg @{rpe}" when
// reps vary across sets). Shared parts are pulled out to a prefix:
//   uniform reps + has weights → "4×8 · 100 @7, 100 @7, 105 @8 kg"
//   uniform reps + bodyweight → "4×8 · @7, @7, @8 (oma p.)"
//   varying reps + has weights → "5×100 @7, 5×100 @7, 8×80 @7 kg"
// weight may be a planned range string ("160-170") or a logged number.
type SetDatum = { reps: string | null; weight: string | number | null; rpe: string | null };

// Per-set inline summary: each set rendered as "reps/weight/rpe", sets
// separated by ", ". "kg" unit appended once at the end when any weights
// are present.
//   "5/100/7, 5/100/7, 5/105/8, 5/105/8 kg"
function buildSetsLine(items: SetDatum[]): string {
  if (items.length === 0) return "—";
  const wStr = (w: string | number | null) => (w == null ? "" : String(w).trim());
  const hasW = (w: string | number | null) => {
    const t = wStr(w);
    return t !== "" && rangeBounds(t).some((n) => n > 0);
  };
  const anyWeight = items.some((s) => hasW(s.weight));
  const tokens = items.map((s) => {
    const repsStr = s.reps != null ? String(s.reps) : "";
    const reps = repsStr.trim() !== "" ? repsStr : "—";
    const w = hasW(s.weight) ? wStr(s.weight) : "—";
    const rpeStr = s.rpe != null ? String(s.rpe) : "";
    const rpe = rpeStr.trim() !== "" ? rpeStr : "—";
    return `${reps}×${w}@${rpe}`;
  });
  const list = tokens.join(", ");
  return anyWeight ? `${list} kg` : list;
}

function plannedSetsLine(cfgs: SetConfig[]): string {
  return buildSetsLine(cfgs.map((s) => ({ reps: s.reps, weight: s.weight, rpe: s.rpe })));
}

function shortenExName(name: string): string {
  if (name.length <= 16) return name;
  return name
    .replace("Romanian maastaveto", "Rom. maasto")
    .replace("Bulgarian askelkyykky", "Bulg. askel")
    .replace("Vinopenkki kahvakuula", "Vinopenkki kk.")
    .replace("Pystypunnerrus", "Pystypunn.")
    .replace("Triceps push-down", "Tric. push-d.")
    .replace("Pohjeprässi", "Pohjepr.")
    .replace("Hauiskääntö", "Hauiskä.")
    .slice(0, 18);
}

// Logs grouped by exercise_id (not program_exercise_id): deleting/recreating a
// program_exercise nulls set_logs.program_exercise_id (FK on delete set null),
// which orphaned logged sets from this card. exercise_id is NOT NULL and stable.
// ponytail: same exercise twice in one day would merge; split by program_exercise_id only if that case appears.
function logsByPe(completion: ProgramCompletion | undefined, dayId: string): Map<string, CompletedSet[]> {
  const map = new Map<string, CompletedSet[]>();
  if (!completion) return map;
  const sw = completion.byDayId[dayId];
  if (!sw) return map;
  for (const log of sw.set_logs) {
    if (!log.exercise_id) continue;
    const arr = map.get(log.exercise_id) ?? [];
    arr.push(log);
    map.set(log.exercise_id, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
  }
  return map;
}

// One performed session of a given exercise within a block.
type HistorySession = {
  key: string;
  weekNumber: number;
  weekName: string | null;
  dayName: string;
  date: string | null;
  status: string;
  logs: CompletedSet[];
};

// Collect every performed instance of `ex` across the whole block, newest first.
// Matches by exercise_id (falls back to name) so copied weeks — which carry new
// program_exercise ids — still resolve to the same exercise's logged sets.
function exerciseBlockHistory(
  block: Block,
  ex: ProgramExerciseRow,
  completion: ProgramCompletion | undefined
): HistorySession[] {
  if (!completion) return [];
  const sessions: HistorySession[] = [];
  for (const w of block.program_weeks) {
    for (const d of w.program_days) {
      const pe = d.program_exercises.find((p) =>
        ex.exercise_id ? p.exercise_id === ex.exercise_id : p.exercises?.name === ex.exercises?.name
      );
      if (!pe) continue;
      const logs = (pe.exercise_id ? logsByPe(completion, d.id).get(pe.exercise_id) : undefined) ?? [];
      if (logs.length === 0) continue;
      const sw = completion.byDayId[d.id];
      sessions.push({
        key: `${w.id}:${d.id}`,
        weekNumber: w.week_number,
        weekName: w.name,
        dayName: dayDisplayName(d, `Treeni ${d.day_number}`),
        date: sw?.scheduled_date ?? sw?.completed_at ?? null,
        status: sw?.status ?? "",
        logs,
      });
    }
  }
  sessions.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    return b.weekNumber - a.weekNumber;
  });
  return sessions;
}

function fmtSessionDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
}

// ── ProgramEditorV2 ───────────────────────────────────────────────────────────

export function ProgramEditorV2({ programId, clientId }: { programId: string; clientId: string | null }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ["program", programId],
    queryFn: () => getProgramFull(supabase, programId),
  });
  const { data: completion } = useQuery({
    queryKey: ["program-completion", programId, clientId],
    queryFn: () => clientId ? getProgramCompletion(supabase, programId, clientId) : Promise.resolve(undefined),
    enabled: clientId !== null,
  });
  const { data: exerciseBank = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => getExercises(supabase),
  });
  // Whose program — shown in the topbar so the coach always sees the client.
  const { data: clientName } = useQuery({
    queryKey: ["client-name", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", clientId!).single();
      return data?.full_name ?? null;
    },
    enabled: clientId !== null,
    staleTime: 300_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["program", programId] });
    qc.invalidateQueries({ queryKey: ["program-completion", programId] });
  };

  // ── Layout state ──
  // Two overview modes only (Iso grid / Riband). Chosen behind the gear menu.
  const [phaseView, setPhaseView] = useState<"expanded" | "compact">("compact");
  // Mobile: show one pane at a time (the outline list, or the exercise detail).
  const isMobile = useIsMobile();
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  // ── Selection state ──
  // Memoize blocks so it's referentially stable when program is unchanged.
  // Without this, the inline `?? []` produces a new array on every render
  // and the selection-init effect would re-fire every render.
  const blocks = useMemo(() => program?.program_blocks ?? [], [program]);
  const [selBlockId, setSelBlockId] = useState<string | null>(null);
  const [selWeekId, setSelWeekId] = useState<string | null>(null);
  const [selDayId, setSelDayId] = useState<string | null>(null);
  const [selExIdx, setSelExIdx] = useState(0);

  // Initialize selection once program loads
  useEffect(() => {
    if (!program) return;
    if (selBlockId && blocks.find((b) => b.id === selBlockId)) return;
    const firstBlock = blocks[0];
    if (!firstBlock) return;
    const activeWeek = firstBlock.program_weeks.find((w) => w.is_active) ?? firstBlock.program_weeks[0];
    const firstDay = activeWeek?.program_days[0];
    setSelBlockId(firstBlock.id);
    setSelWeekId(activeWeek?.id ?? null);
    setSelDayId(firstDay?.id ?? null);
    setSelExIdx(0);
  }, [program, blocks, selBlockId]);

  const block = blocks.find((b) => b.id === selBlockId) ?? blocks[0] ?? null;
  const weeks = block?.program_weeks ?? [];
  const week = weeks.find((w) => w.id === selWeekId) ?? weeks[0] ?? null;
  const days = week?.program_days ?? [];
  const day = days.find((d) => d.id === selDayId) ?? days[0] ?? null;
  const exercises = day?.program_exercises ?? [];
  const exercise = exercises[Math.min(selExIdx, exercises.length - 1)] ?? null;

  // Stay in sync if selected week not in current block
  useEffect(() => {
    if (!block) return;
    if (!week) {
      const w = block.program_weeks[0];
      setSelWeekId(w?.id ?? null);
      setSelDayId(w?.program_days[0]?.id ?? null);
      setSelExIdx(0);
    } else if (!day) {
      const d = week.program_days[0];
      setSelDayId(d?.id ?? null);
      setSelExIdx(0);
    }
  }, [block, week, day]);

  // Keyboard: [ / ] (or Alt+↑/↓) cycle exercises in the open day; ignored while
  // typing in a field so it never fights the inputs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const count = day?.program_exercises.length ?? 0;
      if (count === 0) return;
      if (e.key === "]" || (e.altKey && e.key === "ArrowDown")) {
        e.preventDefault();
        setSelExIdx((i) => Math.min(count - 1, i + 1));
      } else if (e.key === "[" || (e.altKey && e.key === "ArrowUp")) {
        e.preventDefault();
        setSelExIdx((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day]);

  // ── Topbar state ──
  const [saveLabel, setSaveLabel] = useState("Tallenna");
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) return; // Template programs are not scheduled
      const { error } = await supabase.rpc("schedule_program", { _program: programId, _client: clientId });
      if (error) throw error;
    },
  });
  async function handleSave() {
    if (rescheduleMutation.isPending) return;
    try {
      await rescheduleMutation.mutateAsync();
      setSaveLabel("✓ Tallennettu");
    } catch {
      setSaveLabel("Virhe!");
    }
    invalidate();
    setTimeout(() => setSaveLabel("Tallenna"), 1500);
  }

  // ── Mutations ──
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
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["program", programId] }),
  });

  const renameProgram = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("programs").update({ title }).eq("id", programId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program", programId] }),
  });

  const addBlock = useMutation({
    mutationFn: async () => {
      const next = (program?.program_blocks?.length ?? 0) + 1;
      const { data: block, error } = await supabase
        .from("program_blocks")
        .insert({ program_id: programId, block_number: next, name: `Jakso ${next}` })
        .select("id")
        .single();
      if (error || !block) throw error ?? new Error("block insert failed");
      // Seed one week + one day so the new block is immediately editable
      const { data: week, error: weekErr } = await supabase
        .from("program_weeks")
        .insert({ program_id: programId, block_id: block.id, week_number: 1 })
        .select("id")
        .single();
      if (weekErr || !week) throw weekErr ?? new Error("week insert failed");
      const { error: dayErr } = await supabase
        .from("program_days")
        .insert({ week_id: week.id, day_number: 1 });
      if (dayErr) throw dayErr;
      return { blockId: block.id, weekId: week.id };
    },
    onSuccess: async ({ blockId, weekId }) => {
      // Refetch first, then jump to the new block
      await qc.invalidateQueries({ queryKey: ["program", programId] });
      setSelBlockId(blockId);
      setSelWeekId(weekId);
      setSelDayId(null); // will resolve to first day via the selection effect
      setSelExIdx(0);
    },
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string | null }) => {
      const { error } = await supabase
        .from("program_blocks")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        const b = next.program_blocks?.find((x) => x.id === id);
        if (b) b.name = name;
        return next;
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const duplicateBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const src = program?.program_blocks?.find((b) => b.id === blockId);
      if (!src) throw new Error("Block not found");
      const newBlockNumber =
        Math.max(0, ...((program?.program_blocks ?? []).map((b) => b.block_number))) + 1;
      const { data: newBlock, error: blockErr } = await supabase
        .from("program_blocks")
        .insert({
          program_id: programId,
          block_number: newBlockNumber,
          name: src.name ? `${src.name} (kopio)` : `Jakso ${newBlockNumber}`,
          description: src.description,
        })
        .select("id")
        .single();
      if (blockErr || !newBlock) throw blockErr ?? new Error("block insert failed");

      let firstWeekId: string | null = null;
      for (const w of src.program_weeks ?? []) {
        const { data: newWeek, error: wErr } = await supabase
          .from("program_weeks")
          .insert({
            program_id: programId,
            block_id: newBlock.id,
            week_number: w.week_number,
            name: w.name,
            description: w.description,
            is_active: false,
          })
          .select("id")
          .single();
        if (wErr || !newWeek) throw wErr ?? new Error("week insert failed");
        if (!firstWeekId) firstWeekId = newWeek.id;

        for (const d of w.program_days ?? []) {
          const { data: newDay, error: dErr } = await supabase
            .from("program_days")
            .insert({ week_id: newWeek.id, day_number: d.day_number, name: d.name, description: d.description })
            .select("id")
            .single();
          if (dErr || !newDay) throw dErr ?? new Error("day insert failed");
          const pes = d.program_exercises ?? [];
          if (pes.length > 0) {
            const { error: exErr } = await supabase.from("program_exercises").insert(
              pes.map((pe) => ({
                day_id: newDay.id,
                exercise_id: pe.exercise_id,
                order_idx: pe.order_idx,
                sets: pe.sets,
                reps: pe.reps,
                intensity: pe.intensity,
                intensity_type: pe.intensity_type,
                target_rpe: pe.target_rpe,
                target_rpes: pe.target_rpes as any,
                set_configs: pe.set_configs as any,
                rest_sec: pe.rest_sec,
                notes: pe.notes,
              }))
            );
            if (exErr) throw exErr;
          }
        }
      }
      return { blockId: newBlock.id, weekId: firstWeekId };
    },
    onSuccess: async ({ blockId, weekId }) => {
      await qc.invalidateQueries({ queryKey: ["program", programId] });
      setSelBlockId(blockId);
      setSelWeekId(weekId);
      setSelDayId(null);
      setSelExIdx(0);
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase.from("program_blocks").delete().eq("id", blockId);
      if (error) throw error;
    },
    onMutate: async (blockId) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        next.program_blocks = next.program_blocks?.filter((b) => b.id !== blockId);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<{ id: string; label: string } | null>(null);

  const addWeek = useMutation({
    mutationFn: async (blockId: string) => {
      const b = program?.program_blocks?.find((x) => x.id === blockId);
      const next = (b?.program_weeks?.length ?? 0) + 1;
      const { error } = await supabase
        .from("program_weeks")
        .insert({ program_id: programId, block_id: blockId, week_number: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addDay = useMutation({
    mutationFn: async (weekId: string) => {
      const { data: last } = await supabase
        .from("program_days")
        .select("day_number")
        .eq("week_id", weekId)
        .order("day_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = (last?.day_number ?? 0) + 1;
      const { error } = await supabase.from("program_days").insert({ week_id: weekId, day_number: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addExerciseMut = useMutation({
    mutationFn: async (dayId: string) => {
      const d = days.find((x) => x.id === dayId);
      const next = d?.program_exercises?.length ?? 0;
      const { error } = await supabase.from("program_exercises").insert({
        day_id: dayId,
        exercise_id: null,
        order_idx: next,
        sets: 1,
        set_configs: [{ reps: null, weight: null, rpe: null }] as any,
      });
      if (error) throw error;
    },
    onSuccess: (_data, dayId) => {
      qc.invalidateQueries({ queryKey: ["program", programId] });
      // After insert, auto-select the newly added row and open the picker
      const d = days.find((x) => x.id === dayId);
      const nextIdx = d?.program_exercises?.length ?? 0;
      setSelExIdx(nextIdx);
      setOpenPickerForPeId("__pending__");
    },
  });

  const assignExercise = useMutation({
    mutationFn: async ({ peId, exerciseId }: { peId: string; exerciseId: string }) => {
      const { error } = await supabase
        .from("program_exercises")
        .update({ exercise_id: exerciseId })
        .eq("id", peId);
      if (error) throw error;
    },
    onMutate: async ({ peId, exerciseId }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      const exData = exerciseBank.find((e) => e.id === exerciseId);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            for (const d of w.program_days ?? []) {
              const pe = d.program_exercises?.find((e) => e.id === peId);
              if (pe) {
                pe.exercise_id = exerciseId;
                pe.exercises = exData
                  ? {
                      id: exData.id,
                      name: exData.name,
                      video_path: null,
                      instructions: null,
                      kind: "lifting",
                      tracks_weight: true,
                      tracks_reps: true,
                      tracks_distance: false,
                      tracks_duration: false,
                      tracks_hr: false,
                    }
                  : null;
              }
            }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["program", programId] }),
  });

  const [openPickerForPeId, setOpenPickerForPeId] = useState<string | null>(null);

  // When a fresh row appears (after addExerciseMut), open its picker
  useEffect(() => {
    if (openPickerForPeId !== "__pending__") return;
    if (!day) return;
    const newest = day.program_exercises[day.program_exercises.length - 1];
    if (newest && !newest.exercise_id) {
      setOpenPickerForPeId(newest.id);
    }
  }, [day, openPickerForPeId]);

  const deleteWeek = useMutation({
    mutationFn: async (weekId: string) => {
      const { error } = await supabase.from("program_weeks").delete().eq("id", weekId);
      if (error) throw error;
    },
    onMutate: async (weekId) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          b.program_weeks = b.program_weeks?.filter((w) => w.id !== weekId);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const [pendingDeleteWeek, setPendingDeleteWeek] = useState<{ id: string; label: string } | null>(null);

  const deleteDay = useMutation({
    mutationFn: async ({ dayId, weekId }: { dayId: string; weekId: string }) => {
      // Delete the day
      const { error: delErr } = await supabase.from("program_days").delete().eq("id", dayId);
      if (delErr) throw delErr;
      // Renumber remaining days in this week to 1..N (two-phase to avoid
      // unique (week_id, day_number) collisions)
      const wk = (program?.program_blocks ?? [])
        .flatMap((b) => b.program_weeks)
        .find((w) => w.id === weekId);
      const remaining = (wk?.program_days ?? [])
        .filter((d) => d.id !== dayId)
        .sort((a, b) => a.day_number - b.day_number);
      if (remaining.length === 0) return;
      const r1 = await Promise.all(remaining.map((d, i) =>
        supabase.from("program_days").update({ day_number: 1000 + i }).eq("id", d.id)
      ));
      const e1 = r1.find((r) => r.error)?.error;
      if (e1) throw e1;
      const r2 = await Promise.all(remaining.map((d, i) =>
        supabase.from("program_days").update({ day_number: i + 1 }).eq("id", d.id)
      ));
      const e2 = r2.find((r) => r.error)?.error;
      if (e2) throw e2;
    },
    onMutate: async ({ dayId, weekId }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? []) {
            if (w.id !== weekId) continue;
            w.program_days = (w.program_days ?? [])
              .filter((d) => d.id !== dayId)
              .sort((a, b) => a.day_number - b.day_number)
              .map((d, i) => ({ ...d, day_number: i + 1 }));
          }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const [pendingDeleteDay, setPendingDeleteDay] = useState<{ id: string; weekId: string; label: string } | null>(null);

  const reorderDays = useMutation({
    mutationFn: async ({ orderedIds }: { weekId: string; orderedIds: string[] }) => {
      // Two-phase to avoid unique constraint collisions on (week_id, day_number)
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
          const w = b.program_weeks?.find((w) => w.id === weekId);
          if (w) {
            const dayMap = new Map((w.program_days ?? []).map((d) => [d.id, d] as const));
            w.program_days = orderedIds.flatMap((id, i) => {
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
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const reorderExercises = useMutation({
    mutationFn: async ({ orderedIds }: { dayId: string; orderedIds: string[] }) => {
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
            const d = w.program_days?.find((d) => d.id === dayId);
            if (d) {
              const peMap = new Map((d.program_exercises ?? []).map((e) => [e.id, e] as const));
              d.program_exercises = orderedIds.flatMap((id, i) => {
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
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const deleteExercise = useMutation({
    mutationFn: async ({ peId, dayId }: { peId: string; dayId: string }) => {
      const { error: delErr } = await supabase.from("program_exercises").delete().eq("id", peId);
      if (delErr) throw delErr;
      // Renumber remaining exercises in this day to 0..N-1 (two-phase to avoid
      // any (day_id, order_idx) collisions, matching reorderExercises)
      const d = (program?.program_blocks ?? [])
        .flatMap((b) => b.program_weeks)
        .flatMap((w) => w.program_days)
        .find((x) => x.id === dayId);
      const remaining = (d?.program_exercises ?? [])
        .filter((e) => e.id !== peId)
        .sort((a, b) => a.order_idx - b.order_idx);
      if (remaining.length === 0) return;
      const r1 = await Promise.all(remaining.map((e, i) =>
        supabase.from("program_exercises").update({ order_idx: 1000 + i }).eq("id", e.id)
      ));
      const e1 = r1.find((r) => r.error)?.error;
      if (e1) throw e1;
      const r2 = await Promise.all(remaining.map((e, i) =>
        supabase.from("program_exercises").update({ order_idx: i }).eq("id", e.id)
      ));
      const e2 = r2.find((r) => r.error)?.error;
      if (e2) throw e2;
    },
    onMutate: async ({ peId, dayId }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            for (const d of w.program_days ?? []) {
              if (d.id !== dayId) continue;
              d.program_exercises = (d.program_exercises ?? [])
                .filter((e) => e.id !== peId)
                .sort((a, b) => a.order_idx - b.order_idx)
                .map((e, i) => ({ ...e, order_idx: i }));
            }
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const [pendingDeleteExercise, setPendingDeleteExercise] = useState<{ id: string; dayId: string; label: string } | null>(null);

  const renameWeek = useMutation({
    mutationFn: async ({ weekId, name }: { weekId: string; name: string | null }) => {
      const { error } = await supabase.from("program_weeks").update({ name }).eq("id", weekId);
      if (error) throw error;
    },
    onMutate: async ({ weekId, name }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            if (w.id === weekId) w.name = name;
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const renameDay = useMutation({
    mutationFn: async ({ dayId, name }: { dayId: string; name: string | null }) => {
      const { error } = await supabase.from("program_days").update({ name }).eq("id", dayId);
      if (error) throw error;
    },
    onMutate: async ({ dayId, name }) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? [])
            for (const d of w.program_days ?? [])
              if (d.id === dayId) d.name = name;
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev); },
    onSettled: invalidate,
  });

  const duplicateWeek = useMutation({
    mutationFn: async ({ weekId, blockId }: { weekId: string; blockId: string }) => {
      const b = program?.program_blocks?.find((x) => x.id === blockId);
      const w = b?.program_weeks?.find((x) => x.id === weekId);
      if (!w) throw new Error("Week not found");
      const newWeekNumber =
        Math.max(0, ...((b?.program_weeks ?? []).map((x) => x.week_number))) + 1;
      const { data: newWeek, error: weekErr } = await supabase
        .from("program_weeks")
        .insert({
          program_id: programId,
          block_id: blockId,
          week_number: newWeekNumber,
          name: w.name ? `${w.name} (kopio)` : null,
          description: w.description,
          is_active: false,
        })
        .select("id")
        .single();
      if (weekErr) throw weekErr;
      for (const d of w.program_days ?? []) {
        const { data: newDay, error: dayErr } = await supabase
          .from("program_days")
          .insert({ week_id: newWeek.id, day_number: d.day_number, name: d.name, description: d.description })
          .select("id")
          .single();
        if (dayErr) throw dayErr;
        const pes = d.program_exercises ?? [];
        if (pes.length > 0) {
          const { error: exErr } = await supabase.from("program_exercises").insert(
            pes.map((pe) => ({
              day_id: newDay.id,
              exercise_id: pe.exercise_id,
              order_idx: pe.order_idx,
              sets: pe.sets,
              reps: pe.reps,
              intensity: pe.intensity,
              intensity_type: pe.intensity_type,
              target_rpe: pe.target_rpe,
              target_rpes: pe.target_rpes as any,
              set_configs: pe.set_configs as any,
              rest_sec: pe.rest_sec,
              notes: pe.notes,
            }))
          );
          if (exErr) throw exErr;
        }
      }
    },
    onSuccess: invalidate,
  });

  const setActiveWeek = useMutation({
    mutationFn: async (weekId: string) => {
      const allWeeks = (program?.program_blocks ?? []).flatMap((b) => b.program_weeks ?? []);
      if (allWeeks.length > 0) {
        const { error: e1 } = await supabase
          .from("program_weeks")
          .update({ is_active: false })
          .in("id", allWeeks.map((w) => w.id));
        if (e1) throw e1;
      }
      const { error: e2 } = await supabase
        .from("program_weeks")
        .update({ is_active: true })
        .eq("id", weekId);
      if (e2) throw e2;
    },
    onMutate: async (weekId) => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? []) w.is_active = w.id === weekId;
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const clearActiveWeek = useMutation({
    mutationFn: async () => {
      const allWeeks = (program?.program_blocks ?? []).flatMap((b) => b.program_weeks ?? []);
      if (allWeeks.length === 0) return;
      const { error } = await supabase
        .from("program_weeks")
        .update({ is_active: false })
        .in("id", allWeeks.map((w) => w.id));
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["program", programId] });
      const prev = qc.getQueryData<ProgramFull>(["program", programId]);
      qc.setQueryData(["program", programId], (old: ProgramFull) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const b of next.program_blocks ?? [])
          for (const w of b.program_weeks ?? []) w.is_active = false;
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["program", programId], ctx.prev);
    },
    onSettled: invalidate,
  });

  // Copy sets from one exercise to another (by name/exercise_id match in target week)
  const copySetsToWeek = useMutation({
    mutationFn: async ({
      fromExId,
      toWeekId,
    }: {
      fromExId: string;
      toWeekId: string;
    }) => {
      const fromEx = exercises.find((e) => e.id === fromExId);
      if (!fromEx || !day) throw new Error("From exercise not found");
      const allBlocks = program?.program_blocks ?? [];
      const targetWeek = allBlocks
        .flatMap((b) => b.program_weeks)
        .find((w) => w.id === toWeekId);
      if (!targetWeek) throw new Error("Target week not found");
      // Match day by day_number, exercise by exercise_id (or by name when null)
      const targetDay = targetWeek.program_days.find((d) => d.day_number === day.day_number);
      if (!targetDay) throw new Error("Target day not found");
      const targetEx = targetDay.program_exercises.find((pe) =>
        fromEx.exercise_id ? pe.exercise_id === fromEx.exercise_id : pe.exercises?.name === fromEx.exercises?.name
      );
      if (!targetEx) throw new Error("Target exercise not found");
      const { error } = await supabase
        .from("program_exercises")
        .update({ set_configs: fromEx.set_configs as any, sets: (fromEx.set_configs ?? []).length || fromEx.sets })
        .eq("id", targetEx.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  if (!program) {
    return (
      <div className="mv2" style={{ background: "var(--bg-0)", minHeight: "100vh", padding: 24 }}>
        <Mv2Style />
        <div
          style={{
            height: 200,
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            animation: "mv2pulse 1.5s ease-in-out infinite",
          }}
        />
        <style>{`@keyframes mv2pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      </div>
    );
  }

  if (!block) {
    return (
      <div
        className="mv2"
        style={{
          background: "var(--bg-0)",
          color: "var(--fg-0)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Mv2Style />
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{program.title}</h2>
          <p style={{ fontSize: 14, color: "var(--fg-2)", marginBottom: 20 }}>
            Tässä ohjelmassa ei ole vielä yhtään jaksoa. Luo ensimmäinen aloittaaksesi.
          </p>
          <button
            type="button"
            onClick={() => addBlock.mutate()}
            disabled={addBlock.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 10,
              background: "var(--accent-soft)",
              color: "var(--accent-fg)",
              border: "1px solid var(--accent-line)",
              fontSize: 14,
              fontWeight: 600,
              cursor: addBlock.isPending ? "default" : "pointer",
              opacity: addBlock.isPending ? 0.6 : 1,
            }}
          >
            <Plus size={16} />
            {addBlock.isPending ? "Luodaan…" : "Luo ensimmäinen jakso"}
          </button>
        </div>
      </div>
    );
  }

  const blockIdx = blocks.findIndex((b) => b.id === block.id);
  const totalWorkouts = weeks.reduce((a, w) => a + w.program_days.length, 0);
  const totalSets = weeks.reduce(
    (a, w) =>
      a + w.program_days.reduce((b, d) => b + d.program_exercises.reduce((c, e) => c + configsFromExercise(e).length, 0), 0),
    0
  );

  return (
    <div
      className="mv2"
      style={{
        background: "var(--bg-0)",
        color: "var(--fg-0)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, ui-sans-serif, system-ui)",
      }}
    >
      <Mv2Style />

      {/* Topbar */}
      <Topbar
        programTitle={program.title}
        clientName={clientName ?? null}
        onRename={(t) => renameProgram.mutate(t)}
        onAddBlock={() => addBlock.mutate()}
        phaseView={phaseView}
        setPhaseView={setPhaseView}
        isTemplate={clientId === null}
      />

      {/* Phase strip */}
      <PhaseStrip
        blockName={block.name}
        blockNumber={block.block_number}
        onBlockNameSave={(name) => updateBlock.mutate({ id: block.id, name })}
        weekCount={weeks.length}
        workoutCount={totalWorkouts}
        setCount={totalSets}
        hasPrev={blockIdx > 0}
        hasNext={blockIdx >= 0 && blockIdx < blocks.length - 1}
        onPrev={() => {
          const prev = blocks[blockIdx - 1];
          if (prev) {
            setSelBlockId(prev.id);
            setSelWeekId(prev.program_weeks[0]?.id ?? null);
            setSelDayId(prev.program_weeks[0]?.program_days[0]?.id ?? null);
            setSelExIdx(0);
          }
        }}
        onNext={() => {
          const nx = blocks[blockIdx + 1];
          if (nx) {
            setSelBlockId(nx.id);
            setSelWeekId(nx.program_weeks[0]?.id ?? null);
            setSelDayId(nx.program_weeks[0]?.program_days[0]?.id ?? null);
            setSelExIdx(0);
          }
        }}
        onRequestDelete={() =>
          setPendingDeleteBlock({ id: block.id, label: `Jakso ${block.block_number}${block.name?.trim() ? ` — ${block.name.trim()}` : ""}` })
        }
        canDelete={blocks.length > 1}
        onDuplicate={() => duplicateBlock.mutate(block.id)}
      />

      {/* Phase overview */}
      {phaseView === "expanded" && (
        <PhaseOverview
          block={block}
          weeks={weeks}
          selWeekId={week?.id ?? null}
          selDayId={day?.id ?? null}
          onPick={(weekId, dayId) => {
            setSelWeekId(weekId);
            setSelDayId(dayId);
            setSelExIdx(0);
          }}
          onAddWeek={() => addWeek.mutate(block.id)}
          onRequestDeleteWeek={(w) =>
            setPendingDeleteWeek({ id: w.id, label: `Vk ${w.week_number}${w.name?.trim() ? ` — ${w.name.trim()}` : ""}` })
          }
        />
      )}
      {phaseView === "compact" && (
        <PhaseRibbon
          weeks={weeks}
          selWeekId={week?.id ?? null}
          selDayId={day?.id ?? null}
          onPick={(weekId, dayId) => {
            setSelWeekId(weekId);
            setSelDayId(dayId);
            setSelExIdx(0);
          }}
          onAddWeek={() => addWeek.mutate(block.id)}
          onRequestDeleteWeek={(w) =>
            setPendingDeleteWeek({ id: w.id, label: `Vk ${w.week_number}${w.name?.trim() ? ` — ${w.name.trim()}` : ""}` })
          }
        />
      )}

      <ConfirmDialog
        open={!!pendingDeleteBlock}
        onOpenChange={(o) => { if (!o) setPendingDeleteBlock(null); }}
        title="Poistetaanko jakso?"
        description={`Kaikki jakson (${pendingDeleteBlock?.label ?? ""}) viikot ja treenit poistetaan pysyvästi.`}
        confirmLabel="Poista jakso"
        onConfirm={() => {
          if (!pendingDeleteBlock) return;
          const bid = pendingDeleteBlock.id;
          if (bid === selBlockId) {
            const idx = blocks.findIndex((b) => b.id === bid);
            const fallback = blocks[idx - 1] ?? blocks[idx + 1] ?? null;
            setSelBlockId(fallback?.id ?? null);
            setSelWeekId(fallback?.program_weeks[0]?.id ?? null);
            setSelDayId(fallback?.program_weeks[0]?.program_days[0]?.id ?? null);
            setSelExIdx(0);
          }
          deleteBlock.mutate(bid);
          setPendingDeleteBlock(null);
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteDay}
        onOpenChange={(o) => { if (!o) setPendingDeleteDay(null); }}
        title="Poistetaanko treeni?"
        description={`Treeni "${pendingDeleteDay?.label ?? ""}" liikkeineen poistetaan pysyvästi. Loput viikon treenit numeroidaan uudelleen.`}
        confirmLabel="Poista treeni"
        onConfirm={() => {
          if (!pendingDeleteDay) return;
          const { id: did, weekId } = pendingDeleteDay;
          if (did === selDayId) {
            const wk = weeks.find((w) => w.id === weekId);
            const remaining = (wk?.program_days ?? []).filter((d) => d.id !== did);
            const fallback = remaining.sort((a, b) => a.day_number - b.day_number)[0] ?? null;
            setSelDayId(fallback?.id ?? null);
            setSelExIdx(0);
          }
          deleteDay.mutate({ dayId: did, weekId });
          setPendingDeleteDay(null);
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteExercise}
        onOpenChange={(o) => { if (!o) setPendingDeleteExercise(null); }}
        title="Poistetaanko liike?"
        description={`Liike "${pendingDeleteExercise?.label ?? ""}" sarjoineen poistetaan pysyvästi.`}
        confirmLabel="Poista liike"
        onConfirm={() => {
          if (!pendingDeleteExercise) return;
          const { id: peId, dayId } = pendingDeleteExercise;
          // Keep the exercise selection sensible after the row disappears
          const delIdx = exercises.findIndex((e) => e.id === peId);
          const newLen = exercises.length - 1;
          setSelExIdx((i) => {
            let n = i;
            if (delIdx !== -1 && delIdx < i) n = i - 1;
            return Math.max(0, Math.min(n, newLen - 1));
          });
          deleteExercise.mutate({ peId, dayId });
          setPendingDeleteExercise(null);
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteWeek}
        onOpenChange={(o) => { if (!o) setPendingDeleteWeek(null); }}
        title="Poistetaanko viikko?"
        description={`Kaikki viikon (${pendingDeleteWeek?.label ?? ""}) treenit poistetaan pysyvästi.`}
        confirmLabel="Poista viikko"
        onConfirm={() => {
          if (!pendingDeleteWeek) return;
          const wid = pendingDeleteWeek.id;
          // If deleting the selected week, jump to a neighbor
          if (wid === selWeekId) {
            const idx = weeks.findIndex((w) => w.id === wid);
            const fallback = weeks[idx - 1] ?? weeks[idx + 1] ?? null;
            setSelWeekId(fallback?.id ?? null);
            setSelDayId(fallback?.program_days[0]?.id ?? null);
            setSelExIdx(0);
          }
          deleteWeek.mutate(wid);
          setPendingDeleteWeek(null);
        }}
      />

      {/* Drill-down — one left outline rail (days stacked over the selected day's
          exercises) + a wide detail pane. No horizontal scroll: the rail is fixed
          width and the detail flexes. */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", gap: 12, padding: 12 }}>
        {!week && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", maxWidth: 340 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--fg-3)",
                }}
              >
                <Plus size={22} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>Ei viikkoja vielä</div>
                <p style={{ fontSize: 13, color: "var(--fg-2)", margin: 0, lineHeight: 1.5 }}>
                  Aloita lisäämällä ensimmäinen viikko. Sen jälkeen voit luoda treenit ja liikkeet.
                </p>
              </div>
              <Mv2Button kind="primary" onClick={() => addWeek.mutate(block.id)}>
                <Plus size={14} /> Lisää ensimmäinen viikko
              </Mv2Button>
            </div>
          </div>
        )}
        {week && (!isMobile || mobilePane === "list") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: isMobile ? "100%" : 320, flex: isMobile ? "1 1 0" : "0 0 auto", minWidth: 0, minHeight: 0 }}>
          <SessionsColumn
            week={week}
            block={block}
            selDayId={day?.id ?? null}
            onSelect={(dayId) => {
              setSelDayId(dayId);
              setSelExIdx(0);
            }}
            onAddDay={() => addDay.mutate(week.id)}
            onReorder={(orderedIds) => reorderDays.mutate({ weekId: week.id, orderedIds })}
            onRequestDeleteDay={(d) =>
              setPendingDeleteDay({ id: d.id, weekId: week.id, label: dayDisplayName(d) })
            }
            onRenameWeek={(name) => renameWeek.mutate({ weekId: week.id, name })}
            onDuplicateWeek={() => duplicateWeek.mutate({ weekId: week.id, blockId: block.id })}
            onSetActiveWeek={() => setActiveWeek.mutate(week.id)}
            onClearActiveWeek={() => clearActiveWeek.mutate()}
            onExportPdf={() => exportWeekToPdf(week, block)}
          />
          {day && (
          <ExercisesColumn
            day={day}
            selExIdx={selExIdx}
            onSelect={(idx) => {
              setSelExIdx(idx);
              if (isMobile) setMobilePane("detail");
            }}
            onAdd={() => addExerciseMut.mutate(day.id)}
            onReorder={(orderedIds) => reorderExercises.mutate({ dayId: day.id, orderedIds })}
            onRenameDay={(name) => renameDay.mutate({ dayId: day.id, name })}
            onRequestDeleteExercise={(pe) =>
              setPendingDeleteExercise({ id: pe.id, dayId: day.id, label: pe.exercises?.name ?? "Liike" })
            }
          />
          )}
          </div>
        )}

        {(!isMobile || mobilePane === "detail") && (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            background: "var(--bg-0)",
          }}
        >
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobilePane("list")}
              style={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "10px 14px",
                background: "var(--bg-1)",
                border: "none",
                borderBottom: "1px solid var(--line)",
                color: "var(--fg-1)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <ChevronLeft size={16} /> Takaisin liikkeisiin
            </button>
          )}
          {exercise && day && week && block && (
            <ExerciseDetail
              programId={programId}
              ex={exercise}
              day={day}
              week={week}
              block={block}
              idx={Math.min(selExIdx, exercises.length - 1)}
              total={exercises.length}
              completion={completion}
              exerciseBank={exerciseBank}
              pickerOpen={openPickerForPeId === exercise.id}
              onOpenPicker={() => setOpenPickerForPeId(exercise.id)}
              onClosePicker={() => setOpenPickerForPeId(null)}
              onAssignExercise={(exerciseId) => {
                assignExercise.mutate({ peId: exercise.id, exerciseId });
                setOpenPickerForPeId(null);
              }}
              onPrev={() => setSelExIdx((i) => Math.max(0, i - 1))}
              onNext={() => setSelExIdx((i) => Math.min(exercises.length - 1, i + 1))}
              onJumpWeek={(weekId) => {
                setSelWeekId(weekId);
                // Keep same day_number if possible
                const nextWeek = block.program_weeks.find((w) => w.id === weekId);
                const nextDay =
                  nextWeek?.program_days.find((d) => d.day_number === day.day_number) ??
                  nextWeek?.program_days[0];
                if (nextDay) setSelDayId(nextDay.id);
                setSelExIdx(0);
              }}
              onUpdateExercise={(patch) => updateExercise.mutate(patch)}
              onCopyFromPrev={() => {
                const wIdx = block.program_weeks.findIndex((w) => w.id === week.id);
                const prevW = wIdx > 0 ? block.program_weeks[wIdx - 1] : undefined;
                if (!prevW) return;
                const prevDay = prevW.program_days.find((d) => d.day_number === day.day_number);
                const prevEx = prevDay?.program_exercises.find((pe) =>
                  exercise.exercise_id ? pe.exercise_id === exercise.exercise_id : pe.exercises?.name === exercise.exercises?.name
                );
                if (!prevEx) return;
                updateExercise.mutate({
                  id: exercise.id,
                  set_configs: prevEx.set_configs as any,
                  sets: (prevEx.set_configs ?? []).length || prevEx.sets,
                });
              }}
              onCopyToNext={() => {
                const wIdx = block.program_weeks.findIndex((w) => w.id === week.id);
                const nx = wIdx >= 0 && wIdx < block.program_weeks.length - 1 ? block.program_weeks[wIdx + 1] : undefined;
                if (!nx) return;
                copySetsToWeek.mutate({ fromExId: exercise.id, toWeekId: nx.id });
              }}
            />
          )}
          {!exercise && day && (
            <EmptyDetail onAdd={() => addExerciseMut.mutate(day.id)} />
          )}
        </div>
        )}
      </div>

      {/* Persistent save — floats bottom-right so it always follows scroll.
          Only for client programs; templates auto-save. */}
      {clientId !== null && (
        <button
          onClick={handleSave}
          disabled={rescheduleMutation.isPending}
          title="Tallenna ja ajasta ohjelma"
          style={{
            position: "fixed",
            right: isMobile ? 16 : 24,
            // Lift clear of the mobile bottom nav so it doesn't sit on top of it.
            bottom: isMobile ? 86 : 24,
            zIndex: 60,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "11px 20px",
            borderRadius: 13,
            border: "none",
            background: "var(--cta-bg)",
            color: "var(--cta-fg)",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            cursor: rescheduleMutation.isPending ? "default" : "pointer",
            boxShadow: "0 8px 24px var(--cta-glow), 0 2px 8px rgba(0,0,0,0.25)",
            opacity: rescheduleMutation.isPending ? 0.7 : 1,
          }}
        >
          {rescheduleMutation.isPending ? "Tallennetaan…" : saveLabel}
        </button>
      )}
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function Topbar({
  programTitle,
  clientName,
  onRename,
  onAddBlock,
  phaseView,
  setPhaseView,
  isTemplate,
}: {
  programTitle: string;
  clientName: string | null;
  onRename: (title: string) => void;
  onAddBlock: () => void;
  phaseView: "expanded" | "compact";
  setPhaseView: (v: "expanded" | "compact") => void;
  isTemplate: boolean;
}) {
  const isMobile = useIsMobile();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(programTitle);

  function commitTitle() {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (next && next !== programTitle) onRename(next);
    else setTitleDraft(programTitle);
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 52,
        padding: "0 18px",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, fontSize: 13 }}>
        <Link
          href="/coach/programs"
          style={{ color: "var(--fg-2)", textDecoration: "none" }}
        >
          Ohjelmat
        </Link>
        <ChevronRight size={13} style={{ color: "var(--fg-3)" }} />
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(programTitle); setEditingTitle(false); }
            }}
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--fg-0)",
              background: "var(--bg-2)", border: "1px solid var(--accent-line)",
              borderRadius: 6, padding: "2px 6px", outline: "none", minWidth: 0, maxWidth: 220,
              fontFamily: "inherit",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setTitleDraft(programTitle); setEditingTitle(true); }}
            title="Muokkaa ohjelman nimeä"
            style={{
              color: "var(--fg-0)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis", background: "none", border: "none", padding: 0,
              cursor: "pointer", fontFamily: "inherit", fontSize: 13, maxWidth: 220,
            }}
          >
            {programTitle}
          </button>
        )}
        {clientName && (
          <>
            <ChevronRight size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
            <span style={{ color: "var(--accent-fg)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
              {clientName}
            </span>
          </>
        )}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <Mv2Button kind="ghost" onClick={onAddBlock}>
          <Plus size={13} /> Jakso
        </Mv2Button>
        {!isMobile && (
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            padding: 2,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: 11,
          }}
        >
          {(["compact", "expanded"] as const).map((v) => {
            const active = phaseView === v;
            return (
              <button
                key={v}
                onClick={() => setPhaseView(v)}
                title={v === "expanded" ? "Iso ruudukko" : "Tiivis nauha"}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: active ? "var(--bg-4)" : "transparent",
                  color: active ? "var(--fg-0)" : "var(--fg-2)",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.25)" : "none",
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                {v === "expanded" ? "Iso ruudukko" : "Tiivis nauha"}
              </button>
            );
          })}
        </div>
        )}
        {isTemplate && !isMobile && (
          <span style={{ fontSize: 12, color: "var(--fg-3)", paddingLeft: 4 }}>
            Muutokset tallentuvat automaattisesti
          </span>
        )}
      </div>
    </div>
  );
}

function Mv2Button({
  kind = "ghost",
  onClick,
  disabled,
  children,
  title,
  size = "md",
}: {
  kind?: "ghost" | "primary" | "outline";
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  title?: string;
  size?: "sm" | "md";
}) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: size === "sm" ? 12 : 13,
    fontWeight: 600,
    padding: size === "sm" ? "5px 9px" : "7px 12px",
    borderRadius: 9,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--fg-1)",
    fontFamily: "inherit",
    transition: "background 0.12s, border-color 0.12s, color 0.12s",
  };
  if (kind === "ghost") {
    base.color = "var(--fg-1)";
    base.border = "1px solid var(--line)";
    base.background = "var(--bg-2)";
  }
  if (kind === "primary") {
    // The one brand accent: rainbow gradient (default) / solid Gainly pink (co-brand).
    base.background = "var(--cta-bg)";
    base.borderColor = "transparent";
    base.color = "var(--cta-fg)";
    base.fontWeight = 700;
    base.boxShadow = "0 4px 14px var(--cta-glow)";
  }
  if (kind === "outline") {
    base.border = "1px solid var(--line-2)";
    base.background = "transparent";
  }
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={base}>
      {children}
    </button>
  );
}

// ── Phase strip ───────────────────────────────────────────────────────────────

function PhaseStrip({
  blockName,
  blockNumber,
  onBlockNameSave,
  weekCount,
  workoutCount,
  setCount,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onRequestDelete,
  canDelete,
  onDuplicate,
}: {
  blockName: string | null;
  blockNumber: number;
  onBlockNameSave: (next: string | null) => void;
  weekCount: number;
  workoutCount: number;
  setCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRequestDelete: () => void;
  canDelete: boolean;
  onDuplicate: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        padding: isMobile ? "9px 12px" : "10px 22px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 8 : 14,
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
        flex: "0 0 auto",
      }}
    >
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          color: hasPrev ? "var(--fg-1)" : "var(--fg-3)",
          cursor: hasPrev ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Edellinen jakso"
      >
        <ChevronLeft size={13} />
      </button>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-fg)", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
          Jakso {blockNumber}
        </span>
        <div style={{ fontFamily: "var(--font-disp)", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", minWidth: 0, flex: 1, maxWidth: 320 }}>
          <EditableTitle
            value={blockName}
            fallback={`Jakso ${blockNumber}`}
            onSave={onBlockNameSave}
          />
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!hasNext}
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          color: hasNext ? "var(--fg-1)" : "var(--fg-3)",
          cursor: hasNext ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Seuraava jakso"
      >
        <ChevronRight size={13} />
      </button>
      {!isMobile && <div style={{ width: 1, height: 18, background: "var(--line)" }} />}
      {!isMobile && (
        <div style={{ display: "flex", gap: 14, color: "var(--fg-2)", fontSize: 13 }}>
          <span>
            <b style={{ color: "var(--fg-0)", fontWeight: 700 }}>{weekCount}</b> viikkoa
          </span>
          <span>
            <b style={{ color: "var(--fg-0)", fontWeight: 700 }}>{workoutCount}</b> treeniä
          </span>
          <span>
            <b style={{ color: "var(--fg-0)", fontWeight: 700 }}>{setCount}</b> sarjaa
          </span>
        </div>
      )}
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, position: "relative" }}>
        <Mv2Button kind="ghost" size="sm" title="Jakson toiminnot" onClick={() => setMenuOpen((o) => !o)}>
          <Settings2 size={12} /> Jakso
        </Mv2Button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 51,
                background: "var(--bg-3)",
                border: "1px solid var(--line-2)",
                borderRadius: 12,
                boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                padding: 5,
                minWidth: 200,
              }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 5,
                  color: "var(--fg-1)",
                  fontSize: 12.5,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Copy size={12} /> Monista jakso
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRequestDelete();
                }}
                disabled={!canDelete}
                title={canDelete ? "Poista jakso" : "Vähintään yksi jakso vaaditaan"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 5,
                  color: canDelete ? "#ff6b6b" : "var(--fg-3)",
                  fontSize: 12.5,
                  fontFamily: "inherit",
                  cursor: canDelete ? "pointer" : "not-allowed",
                  textAlign: "left",
                  opacity: canDelete ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canDelete) e.currentTarget.style.background = "rgba(255,90,90,0.10)";
                }}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X size={12} /> Poista jakso
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Phase overview grid ───────────────────────────────────────────────────────

function PhaseOverview({
  block,
  weeks,
  selWeekId,
  selDayId,
  onPick,
  onAddWeek,
  onRequestDeleteWeek,
}: {
  block: Block;
  weeks: Week[];
  selWeekId: string | null;
  selDayId: string | null;
  onPick: (weekId: string, dayId: string) => void;
  onAddWeek: () => void;
  onRequestDeleteWeek: (week: Week) => void;
}) {
  // Determine unique day_numbers across phase (rows)
  const dayNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const w of weeks) for (const d of w.program_days) set.add(d.day_number);
    return Array.from(set).sort((a, b) => a - b);
  }, [weeks]);

  // Measure available width so the grid can scale to fit instead of clipping.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [wrapW, setWrapW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWrapW(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      setWrapW(entries[0]?.contentRect.width ?? el.clientWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit-to-width: when all weeks fit at a readable min column width, fill the
  // row. When they don't, pin columns to the readable min and let the wrapper
  // scroll horizontally — never shrink (zoom out) the whole grid.
  const cols = useMemo(() => {
    const N = weeks.length;
    const LABEL = 64, ADD = 72, GAP = 5, PADX = 18, MINCOL = 120;
    if (wrapW <= 0 || N === 0) {
      return `${LABEL}px repeat(${N}, minmax(0, 1fr)) ${ADD}px`;
    }
    const fixed = LABEL + ADD + GAP * (N + 1) + PADX * 2;
    if ((wrapW - fixed) / N >= MINCOL) {
      return `${LABEL}px repeat(${N}, minmax(0, 1fr)) ${ADD}px`;
    }
    return `${LABEL}px repeat(${N}, ${MINCOL}px) ${ADD}px`;
  }, [weeks.length, wrapW]);

  if (weeks.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
          padding: "20px",
          textAlign: "center",
          color: "var(--fg-3)",
          fontSize: 12,
        }}
      >
        Ei viikkoja vielä.{" "}
        <button onClick={onAddWeek} style={{ color: "var(--accent-fg)", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>
          + Lisää ensimmäinen viikko
        </button>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gridTemplateRows: `26px repeat(${dayNumbers.length || 1}, minmax(76px, auto))`,
          gap: 5,
          padding: "10px 18px 14px",
        }}
      >
        {/* corner */}
        <div />
        {/* week headers */}
        {weeks.map((w) => {
          const sel = w.id === selWeekId;
          return (
            <div
              key={w.id}
              className="mv2-week-head"
              onClick={() => {
                const firstDay = w.program_days[0];
                if (firstDay) onPick(w.id, firstDay.id);
              }}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                background: sel ? "var(--accent-soft)" : "transparent",
                border: sel ? "1px solid var(--accent-line)" : "1px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                position: "relative",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 700, color: sel ? "var(--accent-fg)" : "var(--fg-0)", whiteSpace: "nowrap", flexShrink: 0 }}>
                Viikko {w.week_number}
              </span>
              {w.name?.trim() && (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: sel ? "var(--fg-1)" : "var(--fg-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {w.name.trim()}
                </span>
              )}
              {w.is_active && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--green)",
                    flex: "0 0 auto",
                  }}
                />
              )}
              <button
                className="mv2-week-del"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDeleteWeek(w);
                }}
                title="Poista viikko"
                aria-label="Poista viikko"
                style={{
                  flex: "0 0 auto",
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: "transparent",
                  border: "none",
                  color: "var(--fg-3)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
        <div
          onClick={onAddWeek}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            border: "1px dashed var(--line)",
            color: "var(--fg-3)",
            fontSize: 10.5,
            cursor: "pointer",
          }}
        >
          + Viikko
        </div>

        {/* day rows */}
        {dayNumbers.map((dn) => (
          <DayRow
            key={dn}
            dayNumber={dn}
            weeks={weeks}
            selWeekId={selWeekId}
            selDayId={selDayId}
            onPick={onPick}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

function DayRow({
  dayNumber,
  weeks,
  selWeekId,
  selDayId,
  onPick,
}: {
  dayNumber: number;
  weeks: Week[];
  selWeekId: string | null;
  selDayId: string | null;
  onPick: (weekId: string, dayId: string) => void;
}) {
  // Find the first non-empty day name across weeks for this day_number
  const rowLabel = (() => {
    for (const w of weeks) {
      const d = w.program_days.find((x) => x.day_number === dayNumber);
      const n = d?.name?.trim();
      if (n) return n;
    }
    return `Treeni ${dayNumber}`;
  })();
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 12,
          color: "var(--fg-2)",
          fontWeight: 600,
          padding: "0 4px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={rowLabel}
      >
        {rowLabel}
      </div>
      {weeks.map((w) => {
        const d = w.program_days.find((d) => d.day_number === dayNumber);
        if (!d) {
          return (
            <div
              key={w.id + ":" + dayNumber}
              style={{
                border: "1px dashed var(--line)",
                borderRadius: 7,
                opacity: 0.5,
              }}
            />
          );
        }
        const selected = w.id === selWeekId && d.id === selDayId;
        return (
          <OverviewCell
            key={d.id}
            day={d}
            selected={selected}
            onClick={() => onPick(w.id, d.id)}
          />
        );
      })}
      <div />
    </>
  );
}

function OverviewCell({
  day,
  selected,
  onClick,
}: {
  day: Day;
  selected: boolean;
  onClick: () => void;
}) {
  const c = dayColor(day.day_number);
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? c.bg : `color-mix(in srgb, ${c.fg} 6%, var(--bg-2))`,
        border: `1px solid ${selected ? c.fg : `color-mix(in srgb, ${c.fg} 35%, var(--line))`}`,
        borderRadius: 7,
        padding: "7px 9px 8px 9px",
        cursor: "pointer",
        transition: "background 0.12s, border-color 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        minHeight: 70,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          paddingBottom: 4,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: selected ? "var(--fg-0)" : "var(--fg-1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {dayDisplayName(day, `Treeni ${day.day_number}`)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {day.program_exercises.map((ex) => (
          <OverviewExerciseRow key={ex.id} ex={ex} />
        ))}
      </div>
    </div>
  );
}

function OverviewExerciseRow({ ex }: { ex: ProgramExerciseRow }) {
  const cfgs = configsFromExercise(ex);
  const plannedLine = plannedSetsLine(cfgs);
  const exName = ex.exercises?.name ?? "—";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1.3 }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shortenExName(exName)}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, JetBrains Mono, monospace",
          fontSize: 11.5,
          color: "var(--fg-1)",
          lineHeight: 1.4,
        }}
      >
        {plannedLine}
      </div>
    </div>
  );
}

// ── Compact phase ribbon ──────────────────────────────────────────────────────

function PhaseRibbon({
  weeks,
  selWeekId,
  selDayId,
  onPick,
  onAddWeek,
  onRequestDeleteWeek,
}: {
  weeks: Week[];
  selWeekId: string | null;
  selDayId: string | null;
  onPick: (weekId: string, dayId: string) => void;
  onAddWeek: () => void;
  onRequestDeleteWeek: (week: Week) => void;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
        padding: "10px 18px 14px",
        flex: "0 0 auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Jakson yleiskuva
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>klikkaa solua avataksesi alle</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          overflow: "auto",
          alignItems: "stretch",
        }}
      >
      {weeks.map((w) => {
        const isSel = w.id === selWeekId;
        const setCount = w.program_days.reduce(
          (a, d) => a + d.program_exercises.reduce((b, e) => b + configsFromExercise(e).length, 0),
          0
        );
        return (
          <div
            key={w.id}
            onClick={() => onPick(w.id, w.program_days[0]?.id ?? "")}
            style={{
              flex: "1 1 0",
              minWidth: 110,
              padding: "6px 8px 7px",
              borderRadius: 8,
              cursor: "pointer",
              background: isSel ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${isSel ? "var(--accent-line)" : "var(--line)"}`,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              position: "relative",
            }}
          >
            {w.is_active && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--green)",
                }}
              />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: isSel ? "var(--accent-fg)" : "var(--fg-0)" }}>
                Viikko {w.week_number}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--fg-3)" }}>
                  {setCount}
                </span>
                <button
                  className="mv2-week-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDeleteWeek(w);
                  }}
                  title="Poista viikko"
                  aria-label="Poista viikko"
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: "transparent",
                    border: "none",
                    color: "var(--fg-3)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            </div>
            {w.name?.trim() && (
              <div style={{ fontSize: 11.5, fontWeight: 500, color: isSel ? "var(--fg-1)" : "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {w.name.trim()}
              </div>
            )}
            <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
              {w.program_days.map((d) => {
                const c = dayColor(d.day_number);
                const cellSel = isSel && d.id === selDayId;
                return (
                  <div
                    key={d.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPick(w.id, d.id);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 22,
                      borderRadius: 4,
                      background: c.bg,
                      border: `1px solid ${cellSel ? "var(--accent-fg)" : c.line}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: "0 4px",
                    }}
                    title={dayDisplayName(d)}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        color: c.fg,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {dayDisplayName(d)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div
        onClick={onAddWeek}
        style={{
          flex: "0 0 auto",
          minWidth: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px dashed var(--line-2)",
          borderRadius: 8,
          color: "var(--fg-3)",
          fontSize: 14,
          cursor: "pointer",
        }}
        title="Lisää viikko"
      >
        +
      </div>
      </div>
    </div>
  );
}

// ── Sessions column ───────────────────────────────────────────────────────────

function SessionsColumn({
  week,
  block,
  selDayId,
  onSelect,
  onAddDay,
  onReorder,
  onRequestDeleteDay,
  onRenameWeek,
  onDuplicateWeek,
  onSetActiveWeek,
  onClearActiveWeek,
  onExportPdf,
}: {
  week: Week;
  block: Block;
  selDayId: string | null;
  onSelect: (dayId: string) => void;
  onAddDay: () => void;
  onReorder: (orderedIds: string[]) => void;
  onRequestDeleteDay: (day: Day) => void;
  onRenameWeek: (name: string | null) => void;
  onDuplicateWeek: () => void;
  onSetActiveWeek: () => void;
  onClearActiveWeek: () => void;
  onExportPdf: () => void;
}) {
  const sensors = useDndSensors();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const nextWeekNum =
    (block.program_weeks[block.program_weeks.length - 1]?.week_number ?? week.week_number) + 1;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const days = week.program_days;
    const oldIdx = days.findIndex((d) => d.id === String(active.id));
    const newIdx = days.findIndex((d) => d.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(arrayMove(days, oldIdx, newIdx).map((d) => d.id));
  }

  return (
    <>
    <ColumnShell
      title={
        <>
          <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>Vk {week.week_number}</span>
          <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>·</span>
          <EditableTitle
            value={week.name}
            fallback={`Viikko ${week.week_number}`}
            onSave={onRenameWeek}
          />
        </>
      }
      subtitle="TREENIT"
      action={
        <div style={{ display: "flex", gap: 4, position: "relative" }}>
          <Mv2Button kind="ghost" size="sm" onClick={onAddDay}>
            <Plus size={11} /> Päivä
          </Mv2Button>
          <Mv2Button kind="ghost" size="sm" title="Viikon toiminnot" onClick={() => setMenuOpen((o) => !o)}>
            <Settings2 size={12} />
          </Mv2Button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 51,
                  background: "var(--bg-3)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 12,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  padding: 5,
                  minWidth: 210,
                }}
              >
                <MenuRow
                  icon={<Copy size={12} />}
                  label={`Monista viikoksi ${nextWeekNum}`}
                  onClick={() => {
                    setMenuOpen(false);
                    setPending({
                      title: `Monistetaanko viikoksi ${nextWeekNum}?`,
                      description: `Tämän viikon treenit ja sarjat kopioidaan uudeksi viikoksi ${nextWeekNum}.`,
                      confirmLabel: "Monista",
                      onConfirm: onDuplicateWeek,
                    });
                  }}
                />
                {week.is_active ? (
                  <MenuRow
                    icon={<span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />}
                    label="Poista aktiivisuus"
                    onClick={() => {
                      setMenuOpen(false);
                      setPending({
                        title: "Poistetaanko aktiivisuus?",
                        description: `Viikkoa ${week.week_number} ei enää merkitä aktiiviseksi.`,
                        confirmLabel: "Poista aktiivisuus",
                        onConfirm: onClearActiveWeek,
                      });
                    }}
                  />
                ) : (
                  <MenuRow
                    icon={<span style={{ width: 8, height: 8, borderRadius: "50%", border: "1px solid var(--fg-3)", display: "inline-block" }} />}
                    label="Aseta aktiiviseksi"
                    onClick={() => {
                      setMenuOpen(false);
                      setPending({
                        title: "Asetetaanko viikko aktiiviseksi?",
                        description: `Viikko ${week.week_number} merkitään aktiiviseksi ja aiempi aktiivinen viikko poistetaan.`,
                        confirmLabel: "Aseta aktiiviseksi",
                        onConfirm: onSetActiveWeek,
                      });
                    }}
                  />
                )}
                <MenuRow
                  icon={<ClipboardList size={12} />}
                  label="Vie PDF"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportPdf();
                  }}
                />
              </div>
            </>
          )}
        </div>
      }
      fill
      grow={1}
    >
      {week.program_days.length === 0 && (
        <EmptyColumnHint
          text="Ei treenejä vielä."
          actionLabel="Lisää ensimmäinen päivä"
          onAction={onAddDay}
        />
      )}
      <DndContext id={`mv2-days-${week.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SC items={week.program_days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {week.program_days.map((d) => (
            <SortableSessionRow
              key={d.id}
              day={d}
              selected={d.id === selDayId}
              onSelect={() => onSelect(d.id)}
              onDelete={() => onRequestDeleteDay(d)}
            />
          ))}
        </SC>
      </DndContext>
    </ColumnShell>
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(o) => { if (!o) setPending(null); }}
      title={pending?.title ?? ""}
      description={pending?.description ?? ""}
      confirmLabel={pending?.confirmLabel}
      onConfirm={() => pending?.onConfirm()}
    />
    </>
  );
}

// Shared dropdown row used by the week/phase action menus.
function MenuRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 10px",
        background: "transparent",
        border: "none",
        borderRadius: 5,
        color: "var(--fg-1)",
        fontSize: 12.5,
        fontFamily: "inherit",
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover-soft)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ display: "inline-flex", width: 14, justifyContent: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

// Teaching empty state for the narrow Sessions/Exercises columns.
function EmptyColumnHint({ text, actionLabel, onAction }: { text: string; actionLabel: string; onAction: () => void }) {
  return (
    <div style={{ padding: "18px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <p style={{ color: "var(--fg-3)", fontSize: 12, margin: 0 }}>{text}</p>
      <Mv2Button kind="outline" size="sm" onClick={onAction}>
        <Plus size={12} /> {actionLabel}
      </Mv2Button>
    </div>
  );
}

function SortableSessionRow({
  day,
  selected,
  onSelect,
  onDelete,
}: {
  day: Day;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: day.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const c = dayColor(day.day_number);
  const cfgs = day.program_exercises.reduce((acc, e) => acc + configsFromExercise(e).length, 0);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onSelect}
        className="mv2-row"
        style={{
          padding: "9px 11px",
          margin: "2px 6px",
          borderRadius: 10,
          background: selected ? "var(--accent-soft)" : "transparent",
          boxShadow: selected ? "inset 0 0 0 1px var(--accent-line)" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 11,
          position: "relative",
        }}
      >
        <span
          {...attributes}
          {...listeners}
          className="mv2-grip"
          style={{ color: "var(--fg-3)", cursor: "grab", touchAction: "none", display: "inline-flex" }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={11} />
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: c.bg,
            border: `1px solid ${c.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
            position: "relative",
          }}
        >
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: c.fg, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {dayBadge(day)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {dayDisplayName(day)}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>
            {day.program_exercises.length} liikettä · {cfgs} sarjaa
          </div>
        </div>
        <button
          className="mv2-row-del"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Poista treeni"
          aria-label="Poista treeni"
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            color: "var(--fg-3)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <X size={12} />
        </button>
        <ChevronRight size={13} style={{ color: selected ? "var(--accent-fg)" : "var(--fg-3)" }} />
      </div>
    </div>
  );
}

// ── Exercises column ──────────────────────────────────────────────────────────

function ExercisesColumn({
  day,
  selExIdx,
  onSelect,
  onAdd,
  onReorder,
  onRenameDay,
  onRequestDeleteExercise,
}: {
  day: Day;
  selExIdx: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  onReorder: (orderedIds: string[]) => void;
  onRenameDay: (name: string | null) => void;
  onRequestDeleteExercise: (pe: ProgramExerciseRow) => void;
}) {
  const c = dayColor(day.day_number);
  const sensors = useDndSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = day.program_exercises;
    const oldIdx = items.findIndex((e) => e.id === String(active.id));
    const newIdx = items.findIndex((e) => e.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    // Keep the selected exercise in sync after move
    if (selExIdx === oldIdx) onSelect(newIdx);
    onReorder(arrayMove(items, oldIdx, newIdx).map((e) => e.id));
  }

  return (
    <ColumnShell
      title={
        <EditableTitle
          value={day.name}
          fallback={`Treeni ${day.day_number}`}
          onSave={onRenameDay}
        />
      }
      subtitle="Liikkeet"
      titleColor={c.fg}
      action={
        <Mv2Button kind="ghost" size="sm" onClick={onAdd}>
          <Plus size={11} /> Liike
        </Mv2Button>
      }
      fill
      grow={1.5}
    >
      {day.program_exercises.length === 0 && (
        <EmptyColumnHint
          text="Ei liikkeitä vielä."
          actionLabel="Lisää liike"
          onAction={onAdd}
        />
      )}
      <DndContext id={`mv2-ex-${day.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SC items={day.program_exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {day.program_exercises.map((pe, i) => (
            <SortableExerciseRow
              key={pe.id}
              pe={pe}
              idx={i}
              selected={i === selExIdx}
              accentFg={c.fg}
              onSelect={() => onSelect(i)}
              onDelete={() => onRequestDeleteExercise(pe)}
            />
          ))}
        </SC>
      </DndContext>
    </ColumnShell>
  );
}

function SortableExerciseRow({
  pe,
  idx,
  selected,
  accentFg,
  onSelect,
  onDelete,
}: {
  pe: ProgramExerciseRow;
  idx: number;
  selected: boolean;
  accentFg: string;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: pe.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const cfgs = configsFromExercise(pe);
  const summary = `${repsLabel(cfgs)} ${rpeLabel(cfgs)}`;
  const name = pe.exercises?.name ?? "—";
  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onSelect}
        className="mv2-row"
        style={{
          padding: "9px 11px",
          margin: "2px 6px",
          borderRadius: 10,
          background: selected ? "var(--accent-soft)" : "transparent",
          boxShadow: selected ? "inset 0 0 0 1px var(--accent-line)" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          {...attributes}
          {...listeners}
          className="mv2-grip"
          style={{ color: "var(--fg-3)", cursor: "grab", touchAction: "none", display: "inline-flex" }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={11} />
        </span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 600, color: selected ? "var(--accent-fg)" : accentFg, width: 16, textAlign: "center", flexShrink: 0 }}>
          {idx + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>
            {summary}
          </div>
        </div>
        <button
          className="mv2-row-del"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Poista liike"
          aria-label="Poista liike"
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            color: "var(--fg-3)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <X size={12} />
        </button>
        <ChevronRight size={13} style={{ color: selected ? "var(--accent-fg)" : "var(--fg-3)" }} />
      </div>
    </div>
  );
}

function EditableTitle({
  value,
  fallback,
  onSave,
}: {
  value: string | null;
  fallback: string;
  onSave: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  useEffect(() => { setVal(value ?? ""); }, [value]);

  function commit() {
    const next = val.trim();
    const normalized = next === "" ? null : next;
    setEditing(false);
    if (normalized !== (value?.trim() || null)) onSave(normalized);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        placeholder={fallback}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "Escape") { setVal(value ?? ""); setEditing(false); }
        }}
        style={{
          width: "100%",
          minWidth: 0,
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          color: "inherit",
          background: "var(--bg-2)",
          border: "1px solid var(--accent-line)",
          borderRadius: 4,
          padding: "1px 5px",
          outline: "none",
        }}
      />
    );
  }
  const display = value?.trim() || fallback;
  const isEmpty = !value?.trim();
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Klikkaa muokataksesi nimeä"
      className="mv2-editable-title"
      style={{
        background: "transparent",
        border: "1px solid transparent",
        padding: "1px 5px",
        margin: "0 -5px",
        cursor: "text",
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "inherit",
        color: isEmpty ? "var(--fg-2)" : "inherit",
        textAlign: "left",
        borderRadius: 4,
        width: "100%",
        minWidth: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>
        {display}
      </span>
      <Pencil
        size={11}
        className="mv2-editable-pencil"
        style={{ flexShrink: 0, color: "var(--fg-3)", opacity: 0.5 }}
      />
    </button>
  );
}

function ColumnShell({
  title,
  subtitle,
  titleColor,
  action,
  width,
  fill,
  grow,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  titleColor?: string;
  action?: ReactNode;
  width?: number;
  fill?: boolean;
  grow?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: fill ? "100%" : width,
        flex: fill ? `${grow ?? 1} 1 0` : "0 0 auto",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "14px 14px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {subtitle && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2 }}>
                {subtitle}
              </div>
            )}
            <div
              style={{
                fontFamily: "var(--font-disp)",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: titleColor || "var(--fg-0)",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {title}
            </div>
          </div>
          {action}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "6px 0 14px" }}>{children}</div>
    </div>
  );
}

// ── Exercise detail ───────────────────────────────────────────────────────────

// Keeps the editor content at a readable `natural` min-width. It never shrinks
// or zooms; when space is tight the whole drill-down row scrolls horizontally
// (see the row's overflowX), so the editor stays full-size and the RPE column
// is always reachable.
function FitScale({
  natural,
  children,
  style,
}: {
  natural: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  // On phones, drop the readable min-width so the detail fits the screen and
  // scrolls vertically instead of forcing a horizontal scroll.
  const isMobile = useIsMobile();
  return <div style={{ minWidth: isMobile ? 0 : natural, ...style }}>{children}</div>;
}

function HistorySessionBlock({ session, accent }: { session: HistorySession; accent: string }) {
  const date = fmtSessionDate(session.date);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
      <div
        style={{
          padding: "8px 12px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>
          VK {session.weekNumber}
          {session.weekName?.trim() ? ` · ${session.weekName.trim()}` : ""} · {session.dayName}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "ui-monospace, monospace" }}>
          {date ?? "—"}
        </span>
      </div>
      <div style={{ padding: "6px 12px 10px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr 1fr 52px",
            gap: 4,
            fontSize: 10,
            color: "var(--fg-3)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "4px 0",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span>Sarja</span>
          <span style={{ textAlign: "center" }}>Toistot</span>
          <span style={{ textAlign: "center" }}>Kuorma</span>
          <span style={{ textAlign: "center" }}>RPE</span>
        </div>
        {session.logs.map((l, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 1fr 52px",
              gap: 4,
              alignItems: "center",
              fontSize: 12.5,
              fontFamily: "ui-monospace, monospace",
              padding: "5px 0",
              borderBottom: i < session.logs.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <span style={{ color: "var(--fg-3)" }}>{l.set_number ?? i + 1}</span>
            <span style={{ textAlign: "center", color: "var(--fg-0)", fontWeight: 600 }}>{l.reps ?? "—"}</span>
            <span style={{ textAlign: "center", color: "var(--fg-0)", fontWeight: 600 }}>
              {l.weight != null ? `${fmtNum(l.weight)} kg` : "—"}
            </span>
            <span style={{ textAlign: "center", color: accent, fontWeight: 600 }}>
              {l.rpe != null ? `@${rpeToStr(l.rpe)}` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseHistoryModal({
  exName,
  blockName,
  sessions,
  accent,
  onClose,
}: {
  exName: string;
  blockName: string;
  sessions: HistorySession[];
  accent: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          width: "min(560px, 100%)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-0)" }}>{exName} — historia</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
              Käynnissä oleva jakso: {blockName}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Sulje"
            style={{ background: "none", border: "none", color: "var(--fg-2)", cursor: "pointer", padding: 4, flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            overflowY: "auto",
            padding: "14px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {sessions.length === 0 ? (
            <div style={{ color: "var(--fg-3)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
              Ei suoritettuja sarjoja tällä jaksolla.
            </div>
          ) : (
            sessions.map((s) => <HistorySessionBlock key={s.key} session={s} accent={accent} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseDetail({
  programId,
  ex,
  day,
  week,
  block,
  idx,
  total,
  completion,
  exerciseBank,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onAssignExercise,
  onPrev,
  onNext,
  onJumpWeek,
  onUpdateExercise,
  onCopyFromPrev,
  onCopyToNext,
}: {
  programId: string;
  ex: ProgramExerciseRow;
  day: Day;
  week: Week;
  block: Block;
  idx: number;
  total: number;
  completion: ProgramCompletion | undefined;
  exerciseBank: Array<{ id: string; name: string }>;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onAssignExercise: (exerciseId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpWeek: (weekId: string) => void;
  onUpdateExercise: (patch: ExPatch) => void;
  onCopyFromPrev: () => void;
  onCopyToNext: () => void;
}) {
  const c = dayColor(day.day_number);
  const cfgs = configsFromExercise(ex);
  const isMobile = useIsMobile();

  const [historyOpen, setHistoryOpen] = useState(false);
  const historySessions = useMemo(
    () => exerciseBlockHistory(block, ex, completion),
    [block, ex, completion]
  );
  const blockName = block.name?.trim() || `Jakso ${block.block_number}`;

  const weekIdx = block.program_weeks.findIndex((w) => w.id === week.id);
  const prevWeek: Week | null = weekIdx > 0 ? block.program_weeks[weekIdx - 1] ?? null : null;
  const nextWeek: Week | null =
    weekIdx >= 0 && weekIdx < block.program_weeks.length - 1
      ? block.program_weeks[weekIdx + 1] ?? null
      : null;
  const findNeighbor = (w: Week | null): { ex: ProgramExerciseRow | null; day: Day | null } => {
    if (!w) return { ex: null, day: null };
    const d = w.program_days.find((d) => d.day_number === day.day_number) ?? null;
    if (!d) return { ex: null, day: null };
    const pe =
      d.program_exercises.find((pe) =>
        ex.exercise_id ? pe.exercise_id === ex.exercise_id : pe.exercises?.name === ex.exercises?.name
      ) ?? null;
    return { ex: pe, day: d };
  };
  const prevNb = findNeighbor(prevWeek);
  const nextNb = findNeighbor(nextWeek);

  // Stats
  const totalReps = cfgs.reduce((a, s) => a + (s.reps ? parseInt(s.reps, 10) || 0 : 0), 0);
  // Average RPE across sets; for range values use the midpoint of each set.
  const rpeMids = cfgs.flatMap((s) => {
    const b = rangeBounds(s.rpe);
    return b.length ? [(Math.min(...b) + Math.max(...b)) / 2] : [];
  });
  const avgRpe = rpeMids.length ? (rpeMids.reduce((a, b) => a + b, 0) / rpeMids.length).toFixed(1) : "—";

  return (
    <>
    <div
      style={{
        padding: isMobile ? "14px 14px 28px" : "20px 26px 30px",
        // Day colour zone: a soft wash of the active day's accent fades down the
        // top of the detail so you always know which day you're editing.
        background: `linear-gradient(180deg, color-mix(in srgb, ${c.fg} 9%, var(--bg-0)) 0%, var(--bg-0) 230px)`,
        minHeight: "100%",
      }}
    >
      <FitScale natural={720} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--fg-2)", fontWeight: 500 }}>
        <span>
          Vk {week.week_number} · {week.name?.trim() || `Viikko ${week.week_number}`}
        </span>
        <span style={{ color: "var(--fg-3)" }}>›</span>
        <span style={{ color: c.fg, fontWeight: 600 }}>{dayDisplayName(day)}</span>
        <span>›</span>
        <span style={{ color: "var(--fg-1)" }}>
          Liike {idx + 1}/{total}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: "space-between", alignItems: "flex-start", gap: isMobile ? 10 : 18 }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {pickerOpen || !ex.exercises ? (
            <ExercisePicker
              bank={exerciseBank}
              currentName={ex.exercises?.name ?? null}
              onPick={onAssignExercise}
              onClose={onClosePicker}
              accent={c.fg}
            />
          ) : (
            <button
              type="button"
              onClick={onOpenPicker}
              title="Vaihda liike"
              className="mv2-editable-title"
              style={{
                fontFamily: "var(--font-disp)",
                fontSize: 31,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                background: "none",
                border: "none",
                color: "inherit",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>{ex.exercises.name}</span>
              <Pencil
                size={18}
                className="mv2-editable-pencil"
                style={{ flexShrink: 0, color: "var(--fg-3)", opacity: 0.55 }}
              />
            </button>
          )}
          <div style={{ color: "var(--fg-2)", fontSize: 13.5, marginTop: 8, display: "flex", gap: 16 }}>
            <span>
              <b style={{ color: "var(--fg-0)", fontWeight: 700 }}>{cfgs.length}</b> sarjaa
            </span>
            <span>
              <b style={{ color: "var(--fg-0)", fontWeight: 700 }}>{totalReps}</b> toistoa yht.
            </span>
            <span>
              keskim. RPE <b style={{ color: c.fg, fontWeight: 700 }}>{avgRpe}</b>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Mv2Button kind="ghost" size="sm" onClick={onPrev} disabled={idx === 0} title="Edellinen liike  [  [  ]">
            <ChevronsLeft size={12} /> Edell.
          </Mv2Button>
          <Mv2Button kind="ghost" size="sm" onClick={onNext} disabled={idx >= total - 1} title="Seuraava liike  [  ]  ]">
            Seur. <ChevronsRight size={12} />
          </Mv2Button>
          <div style={{ width: 1, height: 22, background: "var(--line)", alignSelf: "center" }} />
          <Mv2Button
            kind="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            title="Näytä tämän liikkeen koko historia tällä jaksolla"
          >
            <History size={12} /> Historia
            {historySessions.length > 0 && (
              <span style={{ color: "var(--fg-3)", fontWeight: 600 }}>{historySessions.length}</span>
            )}
          </Mv2Button>
          <Mv2Button kind="ghost" size="sm" onClick={onOpenPicker} title="Vaihda liike toiseksi">
            <Pencil size={12} /> Vaihda liike
          </Mv2Button>
        </div>
      </div>

      {/* Cardio targets (visible only for kind=cardio) */}
      {ex.exercises?.kind === "cardio" && (
        <CardioTargetsPanel ex={ex} onUpdate={onUpdateExercise} />
      )}

      {/* Three-week comparison — only meaningful for lifting */}
      {ex.exercises?.kind !== "cardio" && ex.exercises?.kind !== "free" && (
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: "stretch" }}>
        <div style={{ flex: isMobile ? "1 1 auto" : "0 0 154px", minWidth: 0, order: isMobile ? 2 : 0 }}>
          <NeighborWeekCard
            week={prevWeek}
            ex={prevNb.ex}
            day={prevNb.day}
            accent={c.fg}
            completion={completion}
            label="Viime viikko"
            isFuture={false}
            onJump={prevWeek ? () => onJumpWeek(prevWeek.id) : null}
          />
        </div>
        <div style={{ flex: "1 1 0", minWidth: 0, order: isMobile ? 1 : 0 }}>
          <CurrentWeekTable
            ex={ex}
            cfgs={cfgs}
            week={week}
            day={day}
            accent={c}
            onUpdate={onUpdateExercise}
            onCopyFromPrev={onCopyFromPrev}
            onCopyToNext={onCopyToNext}
            canCopyFromPrev={!!prevNb.ex}
            canCopyToNext={!!nextWeek}
          />
        </div>
        <div style={{ flex: isMobile ? "1 1 auto" : "0 0 154px", minWidth: 0, order: isMobile ? 3 : 0 }}>
          <NeighborWeekCard
            week={nextWeek}
            ex={nextNb.ex}
            day={nextNb.day}
            accent={c.fg}
            completion={completion}
            label="Ensi viikko"
            isFuture={true}
            onJump={nextWeek ? () => onJumpWeek(nextWeek.id) : null}
          />
        </div>
      </div>
      )}

      {/* Bottom row — coaching note for the client */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        <div
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 16px",
            maxWidth: 620,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Ohje asiakkaalle
          </div>
          <textarea
            key={`note:${ex.id}:${ex.notes ?? ""}`}
            defaultValue={ex.notes ?? ""}
            placeholder="Lisää ohje tai huomio asiakkaalle…"
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== ex.notes) onUpdateExercise({ id: ex.id, notes: v });
            }}
            rows={3}
            style={{
              width: "100%",
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 9,
              color: "var(--fg-0)",
              fontSize: 14,
              lineHeight: 1.55,
              padding: "8px 10px",
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>
      </div>
      </FitScale>
    </div>

      {historyOpen && (
        <ExerciseHistoryModal
          exName={ex.exercises?.name ?? "Liike"}
          blockName={blockName}
          sessions={historySessions}
          accent={c.fg}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </>
  );
}

function ExercisePicker({
  bank,
  currentName,
  onPick,
  onClose,
  accent,
}: {
  bank: Array<{ id: string; name: string }>;
  currentName: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
  accent: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bank;
    return bank.filter((e) => e.name.toLowerCase().includes(q));
  }, [bank, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={currentName ? `Vaihda liike (nyt: ${currentName})…` : "Valitse liike liikepankista…"}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && filtered[0]) onPick(filtered[0].id);
          }}
          style={{
            flex: 1,
            background: "var(--bg-2)",
            border: `1px solid ${accent}`,
            borderRadius: 6,
            color: "var(--fg-0)",
            fontSize: 18,
            fontWeight: 500,
            padding: "8px 12px",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        {currentName && (
          <Mv2Button kind="ghost" size="sm" onClick={onClose}>
            Peruuta
          </Mv2Button>
        )}
      </div>
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 7,
          maxHeight: 240,
          overflow: "auto",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--fg-3)" }}>
            Ei osumia.
          </div>
        ) : (
          filtered.slice(0, 50).map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                background: "transparent",
                border: "none",
                color: "var(--fg-1)",
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
                borderBottom: "1px solid var(--line)",
              }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--row-hover-2)")}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
            >
              {e.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Current week — editable table ─────────────────────────────────────────────

type ColKey = "reps" | "weight" | "rpe";

function CurrentWeekTable({
  ex,
  cfgs,
  week,
  day,
  accent,
  onUpdate,
  onCopyFromPrev,
  onCopyToNext,
  canCopyFromPrev,
  canCopyToNext,
}: {
  ex: ProgramExerciseRow;
  cfgs: SetConfig[];
  week: Week;
  day: Day;
  accent: (typeof COLORS)[ColorKey];
  onUpdate: (patch: ExPatch) => void;
  onCopyFromPrev: () => void;
  onCopyToNext: () => void;
  canCopyFromPrev: boolean;
  canCopyToNext: boolean;
}) {
  const c = accent;

  function setAt(i: number, partial: Partial<SetConfig>) {
    const next = cfgs.map((s, idx) => (idx === i ? { ...s, ...partial } : s));
    onUpdate({ id: ex.id, set_configs: next, sets: next.length });
  }
  function addRow() {
    const last = cfgs[cfgs.length - 1] ?? { reps: null, weight: null, rpe: null };
    const next = [...cfgs, { ...last }];
    onUpdate({ id: ex.id, set_configs: next, sets: next.length });
  }
  function removeRow(i: number) {
    if (cfgs.length <= 1) return;
    const next = cfgs.filter((_, idx) => idx !== i);
    onUpdate({ id: ex.id, set_configs: next, sets: next.length });
  }
  function reorder(orderedIdxs: number[]) {
    const next = orderedIdxs.flatMap((i) => (cfgs[i] ? [cfgs[i] as SetConfig] : []));
    onUpdate({ id: ex.id, set_configs: next, sets: next.length });
  }

  // ── Spreadsheet-style keyboard nav over the set cells ──
  // Cells carry a stable data-cell="col:row"; we re-focus by that after a
  // commit re-renders the (uncontrolled) inputs.
  const gridRef = useRef<HTMLDivElement | null>(null);
  function focusCell(col: ColKey, row: number) {
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${col}:${row}"]`);
      if (el) { el.focus(); el.select(); }
    });
  }
  function moveCell(col: ColKey, row: number, dir: "up" | "down") {
    const target = dir === "down" ? row + 1 : row - 1;
    if (target < 0 || target > cfgs.length - 1) return;
    focusCell(col, target);
  }
  function enterAdvance(col: ColKey, row: number) {
    if (row >= cfgs.length - 1) addRow();
    focusCell(col, row + 1);
  }
  function fillDown(col: ColKey, row: number, value: string) {
    const v = normalizeRange(value);
    const next = cfgs.map((s, i) => (i >= row ? { ...s, [col]: v } : s));
    onUpdate({ id: ex.id, set_configs: next, sets: next.length });
  }

  const sensors = useDndSensors();
  const rowIds = cfgs.map((_, i) => `set-${i}`);

  function handleSetDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = rowIds.indexOf(String(active.id));
    const newIdx = rowIds.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    reorder(arrayMove(cfgs.map((_, i) => i), oldIdx, newIdx));
  }

  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderTop: `2px solid ${c.fg}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          borderBottom: "1px solid var(--line)",
          background: c.bg,
          gap: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c.fg, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Vk {week.week_number} · Nykyinen
          </span>
          <span style={{ fontSize: 10.5, color: "var(--fg-3)" }} title="↑/↓ siirry riviltä toiselle · Enter seuraava · ⌘/Ctrl+D täytä alas">
            ↑↓ · Enter · ⌘D
          </span>
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <Mv2Button kind="ghost" size="sm" onClick={onCopyFromPrev} disabled={!canCopyFromPrev} title="Kopioi sarjat viime viikolta">
            ← Kopioi
          </Mv2Button>
          <Mv2Button kind="ghost" size="sm" onClick={onCopyToNext} disabled={!canCopyToNext} title="Kopioi sarjat ensi viikkoon">
            Kopioi →
          </Mv2Button>
        </div>
      </div>
      {/* Horizontal scroll instead of clipping: when the window narrows past the
          point where the set columns can't fit (notably on macOS/Safari, whose
          inputs claim a wider intrinsic min-width), the table keeps a readable
          min-width and scrolls — nothing is hidden. */}
      <div ref={gridRef} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 380, borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "var(--bg-2)" }}>
            {["", "Sarja", "Toistot", "Kuorma", "RPE", ""].map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 10px",
                  textAlign: i <= 1 ? "left" : "center",
                  fontSize: 10,
                  color: "var(--fg-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  borderBottom: "1px solid var(--line)",
                  width: i === 0 ? 22 : i === 1 ? 50 : "auto",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <DndContext id={`mv2-sets-${ex.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSetDragEnd}>
          <SC items={rowIds} strategy={verticalListSortingStrategy}>
            <tbody>
              {cfgs.map((s, i) => (
                <SortableSetRow
                  key={rowIds[i]}
                  rowId={rowIds[i]!}
                  s={s}
                  idx={i}
                  isLast={i === cfgs.length - 1}
                  canDelete={cfgs.length > 1}
                  accentFg={c.fg}
                  onChange={(p) => setAt(i, p)}
                  onDelete={() => removeRow(i)}
                  onCellMove={moveCell}
                  onCellEnter={enterAdvance}
                  onCellFill={fillDown}
                />
              ))}
              <tr style={{ borderTop: "1px solid var(--line)", background: "var(--row-hover-soft)" }}>
                <td
                  colSpan={6}
                  onClick={addRow}
                  style={{ padding: "9px 12px", color: "var(--accent-fg)", cursor: "pointer", fontSize: 12.5, fontWeight: 500 }}
                >
                  + Lisää sarja
                </td>
              </tr>
            </tbody>
          </SC>
        </DndContext>
      </table>
      </div>
    </div>
  );
}

function SortableSetRow({
  rowId,
  s,
  idx,
  isLast,
  canDelete,
  accentFg,
  onChange,
  onDelete,
  onCellMove,
  onCellEnter,
  onCellFill,
}: {
  rowId: string;
  s: SetConfig;
  idx: number;
  isLast: boolean;
  canDelete: boolean;
  accentFg: string;
  onChange: (p: Partial<SetConfig>) => void;
  onDelete: () => void;
  onCellMove: (col: ColKey, row: number, dir: "up" | "down") => void;
  onCellEnter: (col: ColKey, row: number) => void;
  onCellFill: (col: ColKey, row: number, value: string) => void;
}) {
  const cellNav = { onMove: onCellMove, onEnter: onCellEnter, onFill: onCellFill };
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: rowId });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderBottom: isLast ? "none" : "1px solid var(--line)",
    background: isDragging ? "var(--row-hover-2)" : undefined,
    opacity: isDragging ? 0.7 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ padding: "8px 10px", color: "var(--fg-3)", fontSize: 11 }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", touchAction: "none", display: "inline-flex" }}
        >
          <GripVertical size={11} />
        </span>
      </td>
      <td style={{ padding: "8px 10px", color: "var(--fg-2)", fontFamily: "ui-monospace, monospace" }}>#{idx + 1}</td>
      <td style={{ padding: "6px 10px" }}>
        <CellInput
          key={`r-${idx}-${s.reps ?? ""}`}
          col="reps"
          row={idx}
          nav={cellNav}
          defaultValue={s.reps ?? ""}
          inputMode="numeric"
          placeholder="esim. 10-12"
          onCommit={(v) => onChange({ reps: normalizeRange(v) })}
        />
      </td>
      <td style={{ padding: "6px 10px", position: "relative" }}>
        <CellInput
          key={`w-${idx}-${s.weight ?? ""}`}
          col="weight"
          row={idx}
          nav={cellNav}
          defaultValue={s.weight ?? ""}
          inputMode="numeric"
          placeholder="esim. 160-170"
          rightAdorn="kg"
          onCommit={(v) => onChange({ weight: normalizeRange(v) })}
        />
      </td>
      <td style={{ padding: "6px 10px" }}>
        <CellInput
          key={`rpe-${idx}-${s.rpe ?? ""}`}
          col="rpe"
          row={idx}
          nav={cellNav}
          defaultValue={s.rpe ?? ""}
          inputMode="numeric"
          placeholder="esim. 6-7"
          onCommit={(v) => onChange({ rpe: normalizeRange(v) })}
          textColor={accentFg}
          bold
        />
      </td>
      <td
        onClick={canDelete ? onDelete : undefined}
        style={{
          padding: "8px 10px",
          textAlign: "center",
          color: "var(--fg-3)",
          cursor: canDelete ? "pointer" : "not-allowed",
          opacity: canDelete ? 1 : 0.3,
        }}
      >
        <X size={12} />
      </td>
    </tr>
  );
}

type CellNav = {
  onMove: (col: ColKey, row: number, dir: "up" | "down") => void;
  onEnter: (col: ColKey, row: number) => void;
  onFill: (col: ColKey, row: number, value: string) => void;
};

function CellInput({
  defaultValue,
  type,
  inputMode,
  placeholder = "—",
  rightAdorn,
  onCommit,
  textColor,
  bold,
  col,
  row,
  nav,
}: {
  defaultValue: string | number;
  type?: string;
  inputMode?: "numeric" | "decimal" | "text";
  placeholder?: string;
  rightAdorn?: string;
  onCommit: (v: string) => void;
  textColor?: string;
  bold?: boolean;
  col?: ColKey;
  row?: number;
  nav?: CellNav;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        data-cell={col && row != null ? `${col}:${row}` : undefined}
        defaultValue={defaultValue}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        size={1}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => {
          const input = e.currentTarget as HTMLInputElement;
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(input.value);
            if (nav && col && row != null) nav.onEnter(col, row);
            else input.blur();
          } else if (e.key === "ArrowDown" && nav && col && row != null) {
            e.preventDefault();
            onCommit(input.value);
            nav.onMove(col, row, "down");
          } else if (e.key === "ArrowUp" && nav && col && row != null) {
            e.preventDefault();
            onCommit(input.value);
            nav.onMove(col, row, "up");
          } else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D") && nav && col && row != null) {
            e.preventDefault();
            nav.onFill(col, row, input.value);
          }
        }}
        style={{
          width: "100%",
          minWidth: 0,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 5,
          color: textColor ?? "var(--fg-0)",
          padding: rightAdorn ? "5px 22px 5px 8px" : "5px 8px",
          fontSize: 13,
          fontWeight: bold ? 600 : 500,
          textAlign: "center",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      {rightAdorn && (
        <span
          style={{
            position: "absolute",
            right: 7,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--fg-3)",
            fontSize: 10,
            fontFamily: "ui-monospace, monospace",
            pointerEvents: "none",
          }}
        >
          {rightAdorn}
        </span>
      )}
    </div>
  );
}

// ── Neighbor week card ────────────────────────────────────────────────────────

function NeighborWeekCard({
  week,
  ex,
  day,
  accent,
  completion,
  label,
  isFuture,
  onJump,
}: {
  week: Week | null;
  ex: ProgramExerciseRow | null;
  day: Day | null;
  accent: string;
  completion: ProgramCompletion | undefined;
  label: string;
  isFuture: boolean;
  onJump: (() => void) | null;
}) {
  if (!week) {
    return (
      <div
        style={{
          background: "transparent",
          border: "1.5px dashed var(--line)",
          borderRadius: 12,
          padding: "20px 12px",
          minHeight: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          color: "var(--fg-3)",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, marginTop: 4 }}>—</div>
        <Mv2Button kind="ghost" size="sm">
          + Lisää viikko
        </Mv2Button>
      </div>
    );
  }

  // Status by matching day in this neighbor week — actually we need a day from this week corresponding to the same day_number.
  // For simplicity, mark "done" if any day in week has a completed scheduled_workout matching this exercise.
  let isDone = false;
  if (day && completion) {
    const sw = completion.byDayId[day.id];
    if (sw?.status === "completed") isDone = true;
  }

  const cfgs = ex ? configsFromExercise(ex) : [];
  // Past sessions: prefer what the client actually performed over the prescription,
  // so a "done" neighbour week shows logged weights/reps/RPE — not just the plan.
  const peLogs = ex?.exercise_id && day ? logsByPe(completion, day.id).get(ex.exercise_id) ?? [] : [];
  const hasLogs = peLogs.length > 0;
  const rows: Array<{ reps: string | number | null; weight: string | number | null; rpe: string | number | null }> =
    hasLogs
      ? peLogs.map((l) => ({ reps: l.reps, weight: l.weight, rpe: l.rpe }))
      : cfgs.map((s) => ({ reps: s.reps, weight: s.weight, rpe: s.rpe }));
  const summary = !ex ? null : hasLogs ? "Toteutunut" : `${repsLabel(cfgs)} ${rpeLabel(cfgs)}`;

  return (
    <div
      onClick={onJump ?? undefined}
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: onJump ? "pointer" : "default",
        opacity: 0.92,
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
          background: "var(--bg-2)",
        }}
      >
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--fg-3)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{label}</span>
            {isDone ? (
              <span style={{ color: "var(--green)", fontSize: 10 }}>✓ tehty</span>
            ) : (
              <span style={{ color: "var(--fg-3)", fontSize: 10 }}>{isFuture ? "suunniteltu" : "—"}</span>
            )}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>
            VK {week.week_number} — {week.name?.trim() || `Viikko ${week.week_number}`}
          </div>
        </div>
        <ArrowUpRight size={11} style={{ color: "var(--fg-3)" }} />
      </div>

      {ex ? (
        <div style={{ padding: "6px 10px 10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "2px 0 6px",
            }}
          >
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: accent, fontWeight: 600 }}>
              {summary}
            </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9.5, color: "var(--fg-3)" }}>
              {rows.length} sarjaa
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {rows.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "16px 1fr 30px",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 6px",
                  background: "var(--bg-2)",
                  borderRadius: 5,
                  fontSize: 11,
                }}
              >
                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--fg-3)", fontSize: 10 }}>
                  {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--fg-0)",
                    textAlign: "center",
                  }}
                >
                  <b>{s.reps ?? "—"}</b>
                  <span style={{ color: "var(--fg-3)", margin: "0 4px" }}>×</span>
                  <b>{s.weight ?? "—"}</b>
                  <span style={{ color: "var(--fg-3)", fontSize: 9, marginLeft: 2 }}>
                    {s.weight ? "kg" : ""}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    color: accent,
                    fontWeight: 600,
                    textAlign: "center",
                    fontSize: 10.5,
                  }}
                >
                  @{s.rpe ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "18px 12px", color: "var(--fg-3)", fontSize: 11.5, textAlign: "center" }}>
          Tätä liikettä ei ole tässä viikossa.
          <div style={{ marginTop: 6, color: "var(--accent-fg)", cursor: "pointer", fontSize: 11 }}>
            + Lisää myös tähän
          </div>
        </div>
      )}
    </div>
  );
}

// ── PDF export (print-to-PDF via clean popup window) ───────────────────────────

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
  );
}

// Build a minimal standalone HTML doc for one week and open the browser print
// dialog (user picks "Save as PDF"). Avoids fighting the app's screen layout —
// the popup has its own clean print styles.
function exportWeekToPdf(week: Week, block: Block) {
  const title = `${block.name?.trim() || `Jakso ${block.block_number}`} — ${
    week.name?.trim() || `Viikko ${week.week_number}`
  }`;
  const days = [...week.program_days].sort((a, b) => a.day_number - b.day_number);
  const body = days
    .map((d) => {
      const rows = d.program_exercises
        .map(
          (pe) =>
            `<tr><td>${escapeHtml(pe.exercises?.name ?? "—")}</td><td>${escapeHtml(
              plannedSetsLine(configsFromExercise(pe))
            )}</td></tr>`
        )
        .join("");
      return `<section><h2>${escapeHtml(dayDisplayName(d))}</h2><table><thead><tr><th>Liike</th><th>Sarjat</th></tr></thead><tbody>${
        rows || `<tr><td colspan="2">Ei liikkeitä</td></tr>`
      }</tbody></table></section>`;
    })
    .join("");

  const html = `<!doctype html><html lang="fi"><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title><style>
*{font-family:-apple-system,system-ui,sans-serif;box-sizing:border-box}
body{margin:32px;color:#111}
h1{font-size:20px;margin:0 0 16px}
section{margin-bottom:20px;page-break-inside:avoid}
h2{font-size:14px;margin:0 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;color:#666;font-weight:600;font-size:10px;text-transform:uppercase;padding:4px 6px}
td{padding:4px 6px;border-top:1px solid #eee;vertical-align:top}
td:first-child{width:40%;font-weight:500}
</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;

  // Hidden iframe instead of window.open — popup blockers (esp. Safari) kill
  // the popup, especially when the click originates inside a dialog.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);
  const w = iframe.contentWindow;
  const doc = w?.document;
  if (!w || !doc) {
    iframe.remove();
    return;
  }
  // Write synchronously, then print — do NOT wait for iframe.onload. The empty
  // about:blank fires load before document.write runs, which in Chrome prod
  // meant print() ran against a blank doc (or no-op). document.write is sync,
  // so the content is in the DOM right after close().
  doc.open();
  doc.write(html);
  doc.close();

  // Clean up on afterprint, not a short timer: Safari's print() is
  // non-blocking, so a quick timeout would yank the iframe before it renders.
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    iframe.remove();
  };
  w.onafterprint = cleanup;
  // One frame for layout to settle, then print.
  setTimeout(() => {
    w.focus();
    w.print();
  }, 100);
  // Fallback for browsers that never fire afterprint.
  setTimeout(cleanup, 60000);
}

// ── Empty detail ──────────────────────────────────────────────────────────────

function EmptyDetail({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 14,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-3)",
        }}
      >
        <ClipboardList size={22} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 320 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>Tyhjä treeni</div>
        <p style={{ fontSize: 13, color: "var(--fg-2)", margin: 0, lineHeight: 1.5 }}>
          Lisää ensimmäinen liike, niin voit määrittää sille sarjat, toistot ja kuorman.
        </p>
      </div>
      <Mv2Button kind="primary" onClick={onAdd}>
        <Plus size={14} /> Lisää ensimmäinen liike
      </Mv2Button>
    </div>
  );
}

// ── Global style hooks ────────────────────────────────────────────────────────

function Mv2Style() {
  return (
    <style>{`
      .mv2 {
        --bg-0: #0a0a0d;
        --bg-1: #121218;
        --bg-2: #1a1a22;
        --bg-3: #22222d;
        --bg-4: #2c2c38;
        --line: rgba(255,255,255,0.08);
        --line-2: rgba(255,255,255,0.16);
        --fg-0: #fafafa;
        --fg-1: #d6d6de;
        --fg-2: #aeaeba;
        --fg-3: #8c8c98;
        --font-disp: var(--font-display), "Bricolage Grotesque", system-ui, sans-serif;
        --pink: #ff3d8a;
        --pink-soft: rgba(255,61,138,0.14);
        --pink-line: rgba(255,61,138,0.4);
        --green: #2ecf8b;
        /* Neutral accent by default. Gainly pink is applied only under
           html.gainly-cobrand (see override below) — a co-brand feature. */
        --accent-fg: #fafafa;
        --accent-soft: rgba(255,255,255,0.10);
        --accent-line: rgba(255,255,255,0.28);
        --accent-contrast: #14121a;
        /* The one default brand accent: the rainbow CTA gradient (white-text-safe
           band). Lives on primary surfaces only — CTAs, active indicators. Co-brand
           collapses it to solid Gainly pink (override below). */
        --cta-bg: linear-gradient(120deg, #4f46e5, #7c3aed, #c026d3, #db2777, #e11d48);
        --cta-fg: #ffffff;
        --cta-glow: rgba(192,38,211,0.35);
        /* Day-1 identity colour — neutral blue (no pink) unless co-branded. */
        --day1-fg: #6ea8fe;
        --day1-bg: rgba(110,168,254,0.12);
        --day1-line: rgba(110,168,254,0.38);
        --row-hover: rgba(255,255,255,0.03);
        --row-hover-2: rgba(255,255,255,0.04);
        --row-hover-soft: rgba(255,255,255,0.015);
        --chip-bg: rgba(255,255,255,0.10);
        --chip-bg-strong: rgba(255,255,255,0.28);
        --chip-bg-mid: rgba(255,255,255,0.12);
        --danger-soft: rgba(255,90,90,0.12);
        --danger-fg: #ff6b6b;
      }
      html.light .mv2 {
        --bg-0: #f3f2f7;
        --bg-1: #ffffff;
        --bg-2: #f1eff6;
        --bg-3: #e8e6ef;
        --bg-4: #dddbe6;
        --line: rgba(0,0,0,0.10);
        --line-2: rgba(0,0,0,0.18);
        --fg-0: #14121a;
        --fg-1: #34323f;
        --fg-2: #524f5e;
        --fg-3: #66647a;
        --accent-fg: #14121a;
        --accent-soft: rgba(0,0,0,0.06);
        --accent-line: rgba(0,0,0,0.22);
        --accent-contrast: #ffffff;
        --row-hover: rgba(0,0,0,0.04);
        --row-hover-2: rgba(0,0,0,0.05);
        --row-hover-soft: rgba(0,0,0,0.02);
        --chip-bg: rgba(0,0,0,0.08);
        --chip-bg-strong: rgba(0,0,0,0.30);
        --chip-bg-mid: rgba(0,0,0,0.10);
        --danger-soft: rgba(220,38,38,0.10);
        --danger-fg: #c81b1b;
      }
      /* Co-brand (Gainly × coach): turn the neutral accent into Gainly pink.
         Applies in both themes; placed last so it wins over the light override. */
      html.gainly-cobrand .mv2 {
        --accent-fg: #ff3d8a;
        --accent-soft: rgba(255,61,138,0.12);
        --accent-line: rgba(255,61,138,0.4);
        --accent-contrast: #ffffff;
        /* Co-brand collapses the rainbow to solid Gainly pink. */
        --cta-bg: #ff1d8c;
        --cta-fg: #ffffff;
        --cta-glow: rgba(255,29,140,0.35);
        --day1-fg: #ff7aa8;
        --day1-bg: rgba(255,122,168,0.10);
        --day1-line: rgba(255,122,168,0.35);
      }
      .mv2 .mv2-row { transition: background 0.12s; }
      .mv2 .mv2-row:hover { background: var(--row-hover); }
      .mv2 .mv2-row .mv2-grip { opacity: 0; transition: opacity 0.12s; }
      .mv2 .mv2-row:hover .mv2-grip { opacity: 1; }
      .mv2 input::-webkit-outer-spin-button, .mv2 input::-webkit-inner-spin-button {
        -webkit-appearance: none; margin: 0;
      }
      .mv2 input[type=number] { -moz-appearance: textfield; }
      .mv2 button:not(:disabled):hover { filter: brightness(1.1); }
      html.light .mv2 button:not(:disabled):hover { filter: brightness(0.96); }
      .mv2 .mv2-week-del { opacity: 0.45; transition: opacity 0.12s, background 0.12s, color 0.12s; }
      .mv2 .mv2-week-head:hover .mv2-week-del,
      .mv2 .mv2-week-del:hover,
      .mv2 .mv2-week-del:focus-visible { opacity: 1; }
      .mv2 .mv2-week-del:hover { background: var(--danger-soft) !important; color: var(--danger-fg) !important; }
      .mv2 .mv2-row-del { opacity: 0; transition: opacity 0.12s, background 0.12s, color 0.12s; }
      .mv2 .mv2-row:hover .mv2-row-del,
      .mv2 .mv2-row-del:focus-visible { opacity: 1; }
      .mv2 .mv2-row-del:hover { background: var(--danger-soft) !important; color: var(--danger-fg) !important; }
      .mv2 .mv2-editable-pencil { transition: opacity 0.12s, color 0.12s; }
      .mv2 .mv2-editable-title:hover .mv2-editable-pencil { opacity: 1 !important; color: var(--accent-fg) !important; }
    `}</style>
  );
}

// ── Cardio targets panel (shown when ex.exercises.kind === 'cardio') ──────────
function CardioTargetsPanel({
  ex,
  onUpdate,
}: {
  ex: ProgramExerciseRow;
  onUpdate: (patch: ExPatch) => void;
}) {
  const tracks = {
    distance: ex.exercises?.tracks_distance ?? false,
    duration: ex.exercises?.tracks_duration ?? false,
    hr: ex.exercises?.tracks_hr ?? false,
  };
  const sets = ex.sets ?? 1;
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--fg-3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Kardio-tavoitteet
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <CardioTargetField
          label="Sarjoja (intervalleja)"
          value={String(sets)}
          onCommit={(v) => {
            const n = parseInt(v, 10);
            onUpdate({ id: ex.id, sets: Number.isFinite(n) && n > 0 ? n : 1 });
          }}
          placeholder="1"
          inputMode="numeric"
        />
        {tracks.distance && (
          <CardioTargetField
            label="Matka (km)"
            value={ex.target_distance_m != null ? (ex.target_distance_m / 1000).toString() : ""}
            onCommit={(v) => {
              const trimmed = v.trim();
              if (!trimmed) return onUpdate({ id: ex.id, target_distance_m: null });
              const km = parseFloat(trimmed.replace(",", "."));
              onUpdate({ id: ex.id, target_distance_m: Number.isFinite(km) ? Math.round(km * 1000) : null });
            }}
            placeholder="5.0"
            inputMode="decimal"
          />
        )}
        {tracks.duration && (
          <CardioTargetField
            label="Aika (hh:mm:ss)"
            value={ex.target_duration_s != null ? formatTargetDuration(ex.target_duration_s) : ""}
            onCommit={(v) => {
              const trimmed = v.trim();
              if (!trimmed) return onUpdate({ id: ex.id, target_duration_s: null });
              const sec = parseTargetDuration(trimmed);
              onUpdate({ id: ex.id, target_duration_s: sec });
            }}
            placeholder="00:25:00"
            inputMode="text"
          />
        )}
        {tracks.hr && (
          <CardioTargetField
            label="Syke (bpm)"
            value={ex.target_hr_bpm != null ? String(ex.target_hr_bpm) : ""}
            onCommit={(v) => {
              const trimmed = v.trim();
              if (!trimmed) return onUpdate({ id: ex.id, target_hr_bpm: null });
              const n = parseInt(trimmed, 10);
              onUpdate({ id: ex.id, target_hr_bpm: Number.isFinite(n) ? n : null });
            }}
            placeholder="150"
            inputMode="numeric"
          />
        )}
        {!tracks.distance && !tracks.duration && !tracks.hr && (
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            Liikkeelle ei ole valittu seurattavia kenttiä. Rastita liikepankissa matka / aika / syke.
          </div>
        )}
      </div>
    </div>
  );
}

function CardioTargetField({
  label,
  value,
  onCommit,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder: string;
  inputMode: "numeric" | "decimal" | "text";
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 120, flex: "1 1 120px" }}>
      <span style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 600, letterSpacing: "0.02em" }}>{label}</span>
      <input
        key={`cardio:${label}:${value}`}
        defaultValue={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onBlur={(e) => {
          if (e.target.value !== value) onCommit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          color: "var(--fg-1)",
          fontSize: 13,
          fontFamily: "inherit",
          padding: "7px 10px",
          outline: "none",
        }}
      />
    </label>
  );
}

function parseTargetDuration(s: string): number | null {
  const parts = s.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.length === 1) return nums[0]!;
  if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
  if (nums.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  return null;
}
function formatTargetDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
