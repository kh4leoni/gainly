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
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  Copy,
  GripVertical,
  Plus,
  Search,
  Settings2,
  TrendingUp,
  X,
  MoreHorizontal,
  ArrowUpRight,
  ClipboardList,
  Paperclip,
  Video,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Block = ProgramFull["program_blocks"][number];
type Week = Block["program_weeks"][number];
type Day = Week["program_days"][number];
type SetConfig = { reps: string | null; weight: number | null; rpe: number | null };
type ExPatch = {
  id: string;
  sets?: number | null;
  reps?: string | null;
  intensity?: number | null;
  target_rpe?: number | null;
  target_rpes?: (number | null)[] | null;
  set_configs?: SetConfig[] | null;
  notes?: string | null;
};

// ── Design tokens (scoped via style on root) ───────────────────────────────────

const TOKENS: CSSProperties = {
  // neutrals
  ["--bg-0" as any]: "#0a0a0d",
  ["--bg-1" as any]: "#111116",
  ["--bg-2" as any]: "#17171f",
  ["--bg-3" as any]: "#1f1f29",
  ["--bg-4" as any]: "#2a2a36",
  ["--line" as any]: "rgba(255,255,255,0.08)",
  ["--line-2" as any]: "rgba(255,255,255,0.14)",
  ["--fg-0" as any]: "#fafafa",
  ["--fg-1" as any]: "#c8c8d0",
  ["--fg-2" as any]: "#8a8a96",
  ["--fg-3" as any]: "#5b5b66",
  // brand
  ["--pink" as any]: "#ff3d8a",
  ["--pink-soft" as any]: "rgba(255,61,138,0.14)",
  ["--pink-line" as any]: "rgba(255,61,138,0.4)",
  ["--green" as any]: "#2ecf8b",
  // accent (mirror pink)
  ["--accent-fg" as any]: "#ff3d8a",
  ["--accent-soft" as any]: "rgba(255,61,138,0.12)",
  ["--accent-line" as any]: "rgba(255,61,138,0.4)",
  ["--accent-contrast" as any]: "#1a0410",
};

const COLORS = {
  rose: { fg: "#FF7AA8", bg: "rgba(255,122,168,0.10)", line: "rgba(255,122,168,0.35)" },
  amber: { fg: "#F2B872", bg: "rgba(242,184,114,0.10)", line: "rgba(242,184,114,0.35)" },
  violet: { fg: "#B69CFF", bg: "rgba(182,156,255,0.10)", line: "rgba(182,156,255,0.35)" },
  cyan: { fg: "#7BD3E5", bg: "rgba(123,211,229,0.10)", line: "rgba(123,211,229,0.35)" },
} as const;
type ColorKey = keyof typeof COLORS;
const COLOR_CYCLE: ColorKey[] = ["rose", "amber", "violet", "cyan"];

function dayColor(dayNumber: number): (typeof COLORS)[ColorKey] {
  const k = COLOR_CYCLE[(dayNumber - 1) % COLOR_CYCLE.length] ?? "rose";
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
    weight: pe.intensity ?? null,
    rpe: rpes[i] ?? pe.target_rpe ?? null,
  }));
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

// Summary range: collapses when all values are equal. Used in the Exercises
// column / neighbor cards where vertical space is tight.
function repsLabel(cfgs: SetConfig[]): string {
  if (cfgs.length === 0) return "—";
  const nums = cfgs.map((s) => (s.reps ? parseInt(s.reps, 10) : NaN)).filter((n) => !isNaN(n));
  if (nums.length === 0) return `${cfgs.length}×—`;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${cfgs.length}×${min}` : `${cfgs.length}×${min}-${max}`;
}

function weightLabel(cfgs: SetConfig[]): string {
  const ws = cfgs.map((s) => s.weight).filter((w): w is number => typeof w === "number" && w > 0);
  if (ws.length === 0) return "oma p.";
  const min = Math.min(...ws);
  const max = Math.max(...ws);
  return min === max ? `${min}kg` : `${min}-${max}kg`;
}

function rpeLabel(cfgs: SetConfig[]): string {
  const rs = cfgs.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
  if (rs.length === 0) return "@—";
  const min = Math.min(...rs);
  const max = Math.max(...rs);
  return min === max ? `@${min}` : `@${min}-${max}`;
}

// Per-set inline summary used in phase-overview cells.
// Each set rendered as "{weight}kg @{rpe}" (or "{reps}×{weight}kg @{rpe}" when
// reps vary across sets). Shared parts are pulled out to a prefix:
//   uniform reps + has weights → "4×8 · 100 @7, 100 @7, 105 @8 kg"
//   uniform reps + bodyweight → "4×8 · @7, @7, @8 (oma p.)"
//   varying reps + has weights → "5×100 @7, 5×100 @7, 8×80 @7 kg"
type SetDatum = { reps: string | null; weight: number | null; rpe: number | null };

// Per-set inline summary: each set rendered as "reps/weight/rpe", sets
// separated by ", ". "kg" unit appended once at the end when any weights
// are present.
//   "5/100/7, 5/100/7, 5/105/8, 5/105/8 kg"
function buildSetsLine(items: SetDatum[]): string {
  if (items.length === 0) return "—";
  const anyWeight = items.some((s) => typeof s.weight === "number" && s.weight > 0);
  const tokens = items.map((s) => {
    const reps = s.reps && s.reps.trim() !== "" ? s.reps : "—";
    const w = typeof s.weight === "number" && s.weight > 0 ? fmtNum(s.weight) : "—";
    const rpe = typeof s.rpe === "number" ? fmtNum(s.rpe) : "—";
    return `${reps}×${w}@${rpe}`;
  });
  const list = tokens.join(", ");
  return anyWeight ? `${list} kg` : list;
}

function plannedSetsLine(cfgs: SetConfig[]): string {
  return buildSetsLine(cfgs.map((s) => ({ reps: s.reps, weight: s.weight, rpe: s.rpe })));
}

function achievedSetsLine(logs: CompletedSet[]): string {
  return buildSetsLine(
    logs.map((l) => ({
      reps: l.reps != null ? String(l.reps) : null,
      weight: l.weight,
      rpe: l.rpe,
    }))
  );
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

// Day completion status: done / today / future
function dayStatus(
  dayId: string,
  completion: ProgramCompletion | undefined,
  showCompletion: boolean
): "done" | "today" | "future" {
  if (!showCompletion || !completion) return "future";
  const sw = completion.byDayId[dayId];
  if (!sw) return "future";
  if (sw.status === "completed") return "done";
  const today = new Date().toISOString().slice(0, 10);
  if (sw.scheduled_date && sw.scheduled_date.slice(0, 10) === today) return "today";
  return "future";
}

// Logs grouped by program_exercise_id
function logsByPe(completion: ProgramCompletion | undefined, dayId: string): Map<string, CompletedSet[]> {
  const map = new Map<string, CompletedSet[]>();
  if (!completion) return map;
  const sw = completion.byDayId[dayId];
  if (!sw) return map;
  for (const log of sw.set_logs) {
    if (!log.program_exercise_id) continue;
    const arr = map.get(log.program_exercise_id) ?? [];
    arr.push(log);
    map.set(log.program_exercise_id, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
  }
  return map;
}

// ── ProgramEditorV2 ───────────────────────────────────────────────────────────

export function ProgramEditorV2({ programId, clientId }: { programId: string; clientId: string }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ["program", programId],
    queryFn: () => getProgramFull(supabase, programId),
  });
  const { data: completion } = useQuery({
    queryKey: ["program-completion", programId],
    queryFn: () => getProgramCompletion(supabase, programId, clientId),
  });
  const { data: exerciseBank = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => getExercises(supabase),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["program", programId] });
    qc.invalidateQueries({ queryKey: ["program-completion", programId] });
  };

  // ── Layout state ──
  const [phaseView, setPhaseView] = useState<"expanded" | "compact" | "off">("expanded");
  const [showSummaryRail, setShowSummaryRail] = useState(true);
  const [showProgression] = useState(true);
  const [showCompletion] = useState(true);

  // ── Selection state ──
  const blocks = program?.program_blocks ?? [];
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

  // ── Topbar state ──
  const [saveLabel, setSaveLabel] = useState("Tallenna");
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
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
                  ? { id: exData.id, name: exData.name, video_path: null, instructions: null }
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

  const duplicateWeek = useMutation({
    mutationFn: async ({ weekId, blockId }: { weekId: string; blockId: string }) => {
      const b = program?.program_blocks?.find((x) => x.id === blockId);
      const w = b?.program_weeks?.find((x) => x.id === weekId);
      if (!w) throw new Error("Week not found");
      const newWeekNumber = (b?.program_weeks?.length ?? 0) + 1;
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

  if (!program || !block) {
    return (
      <div style={{ ...TOKENS, background: "var(--bg-0)", minHeight: "100vh", padding: 24 }}>
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

  const blockIdx = blocks.findIndex((b) => b.id === block.id);
  const blockName = block.name?.trim() || `Jakso ${block.block_number}`;
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
        ...TOKENS,
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
        programId={programId}
        programTitle={program.title}
        saveLabel={saveLabel}
        saving={rescheduleMutation.isPending}
        onSave={handleSave}
        onAddBlock={() => addBlock.mutate()}
        phaseView={phaseView}
        setPhaseView={setPhaseView}
        showSummaryRail={showSummaryRail}
        setShowSummaryRail={setShowSummaryRail}
      />

      {/* Phase strip */}
      <PhaseStrip
        blockName={blockName}
        blockNumber={block.block_number}
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
      />

      {/* Phase overview */}
      {phaseView === "expanded" && (
        <PhaseOverview
          block={block}
          weeks={weeks}
          completion={completion}
          showCompletion={showCompletion}
          selWeekId={week?.id ?? null}
          selDayId={day?.id ?? null}
          onPick={(weekId, dayId) => {
            setSelWeekId(weekId);
            setSelDayId(dayId);
            setSelExIdx(0);
          }}
          onAddWeek={() => addWeek.mutate(block.id)}
          onCollapse={() => setPhaseView("compact")}
          onRequestDeleteWeek={(w) =>
            setPendingDeleteWeek({ id: w.id, label: `Vk ${w.week_number}${w.name?.trim() ? ` — ${w.name.trim()}` : ""}` })
          }
        />
      )}
      {phaseView === "compact" && (
        <PhaseRibbon
          weeks={weeks}
          completion={completion}
          showCompletion={showCompletion}
          selWeekId={week?.id ?? null}
          selDayId={day?.id ?? null}
          onPick={(weekId, dayId) => {
            setSelWeekId(weekId);
            setSelDayId(dayId);
            setSelExIdx(0);
          }}
          onAddWeek={() => addWeek.mutate(block.id)}
          onExpand={() => setPhaseView("expanded")}
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

      {/* Drill-down */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {week && (
          <SessionsColumn
            week={week}
            selDayId={day?.id ?? null}
            completion={completion}
            showCompletion={showCompletion}
            onSelect={(dayId) => {
              setSelDayId(dayId);
              setSelExIdx(0);
            }}
            onAddDay={() => addDay.mutate(week.id)}
            onReorder={(orderedIds) => reorderDays.mutate({ weekId: week.id, orderedIds })}
          />
        )}
        {day && (
          <ExercisesColumn
            day={day}
            selExIdx={selExIdx}
            onSelect={setSelExIdx}
            onAdd={() => addExerciseMut.mutate(day.id)}
            onReorder={(orderedIds) => reorderExercises.mutate({ dayId: day.id, orderedIds })}
          />
        )}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            background: "var(--bg-0)",
          }}
        >
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
              showProgression={showProgression}
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

        {showSummaryRail && week && (
          <SummaryRail
            week={week}
            block={block}
            onDuplicateWeek={() => duplicateWeek.mutate({ weekId: week.id, blockId: block.id })}
          />
        )}
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function Topbar({
  programId,
  programTitle,
  saveLabel,
  saving,
  onSave,
  onAddBlock,
  phaseView,
  setPhaseView,
  showSummaryRail,
  setShowSummaryRail,
}: {
  programId: string;
  programTitle: string;
  saveLabel: string;
  saving: boolean;
  onSave: () => void;
  onAddBlock: () => void;
  phaseView: "expanded" | "compact" | "off";
  setPhaseView: (v: "expanded" | "compact" | "off") => void;
  showSummaryRail: boolean;
  setShowSummaryRail: (v: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
        <span style={{ color: "var(--fg-0)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {programTitle}
        </span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative" }}>
          <input
            placeholder="Hae liikettä, viikkoa…"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 7,
              color: "var(--fg-0)",
              padding: "6px 10px 6px 28px",
              fontSize: 12,
              width: 200,
              outline: "none",
            }}
          />
          <Search
            size={12}
            style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)" }}
          />
        </div>
        <Link
          href={`/coach/client-programs/${programId}/edit`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px dashed var(--accent-line)",
            background: "transparent",
            color: "var(--accent-fg)",
            fontSize: 11,
            fontWeight: 500,
            textDecoration: "none",
          }}
          title="Palaa vanhaan näkymään"
        >
          ← v1
        </Link>
        <Mv2Button kind="ghost" onClick={onAddBlock}>
          <Plus size={13} /> Jakso
        </Mv2Button>
        <div style={{ position: "relative" }}>
          <Mv2Button kind="ghost" onClick={() => setMenuOpen((o) => !o)} title="Näkymäasetukset">
            <Settings2 size={13} />
          </Mv2Button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  zIndex: 41,
                  background: "var(--bg-3)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 10,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  padding: 10,
                  width: 230,
                }}
              >
                <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Jakson yleiskuva
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {(["expanded", "compact", "off"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPhaseView(v)}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        borderRadius: 6,
                        background: phaseView === v ? "var(--accent-soft)" : "transparent",
                        border: `1px solid ${phaseView === v ? "var(--accent-line)" : "var(--line)"}`,
                        color: phaseView === v ? "var(--accent-fg)" : "var(--fg-2)",
                        fontSize: 11.5,
                        cursor: "pointer",
                      }}
                    >
                      {v === "expanded" ? "Iso" : v === "compact" ? "Riband" : "Pois"}
                    </button>
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--fg-1)", padding: "4px 0", cursor: "pointer" }}>
                  Viikkoyhteenveto oikealla
                  <input
                    type="checkbox"
                    checked={showSummaryRail}
                    onChange={(e) => setShowSummaryRail(e.target.checked)}
                  />
                </label>
              </div>
            </>
          )}
        </div>
        <Mv2Button kind="primary" onClick={onSave} disabled={saving}>
          {saving ? "Tallennetaan…" : saveLabel}
        </Mv2Button>
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
    fontSize: size === "sm" ? 11 : 12,
    fontWeight: 500,
    padding: size === "sm" ? "4px 8px" : "6px 10px",
    borderRadius: 6,
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
    base.background = "var(--accent-fg)";
    base.borderColor = "var(--accent-fg)";
    base.color = "var(--accent-contrast)";
    base.fontWeight = 600;
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
  weekCount,
  workoutCount,
  setCount,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onRequestDelete,
  canDelete,
}: {
  blockName: string;
  blockNumber: number;
  weekCount: number;
  workoutCount: number;
  setCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRequestDelete: () => void;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      style={{
        padding: "10px 22px",
        display: "flex",
        alignItems: "center",
        gap: 14,
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Jakso {blockNumber}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{blockName}</span>
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
      <div style={{ width: 1, height: 18, background: "var(--line)" }} />
      <div style={{ display: "flex", gap: 12, color: "var(--fg-2)", fontSize: 12 }}>
        <span>
          <b style={{ color: "var(--fg-0)" }}>{weekCount}</b> viikkoa
        </span>
        <span>
          <b style={{ color: "var(--fg-0)" }}>{workoutCount}</b> treeniä
        </span>
        <span>
          <b style={{ color: "var(--fg-0)" }}>{setCount}</b> sarjaa
        </span>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, position: "relative" }}>
        <Mv2Button kind="ghost" size="sm">
          <Copy size={11} /> Monista jakso
        </Mv2Button>
        <Mv2Button kind="ghost" size="sm" title="Lisää" onClick={() => setMenuOpen((o) => !o)}>
          <MoreHorizontal size={12} />
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
                borderRadius: 8,
                boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                padding: 4,
                minWidth: 180,
              }}
            >
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
  completion,
  showCompletion,
  selWeekId,
  selDayId,
  onPick,
  onAddWeek,
  onCollapse,
  onRequestDeleteWeek,
}: {
  block: Block;
  weeks: Week[];
  completion: ProgramCompletion | undefined;
  showCompletion: boolean;
  selWeekId: string | null;
  selDayId: string | null;
  onPick: (weekId: string, dayId: string) => void;
  onAddWeek: () => void;
  onCollapse: () => void;
  onRequestDeleteWeek: (week: Week) => void;
}) {
  // Determine unique day_numbers across phase (rows)
  const dayNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const w of weeks) for (const d of w.program_days) set.add(d.day_number);
    return Array.from(set).sort((a, b) => a - b);
  }, [weeks]);

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
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
        padding: "10px 18px 14px",
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Jakson yleiskuva
          </span>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
            kaikki treenit kerralla · klikkaa solua avataksesi alle
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "var(--fg-3)" }}>
            <Legend dot="var(--green)">tehty</Legend>
            <Legend dot="var(--accent-fg)">tänään</Legend>
            <Legend square>tuleva</Legend>
          </div>
          <Mv2Button kind="ghost" size="sm" onClick={onCollapse} title="Tiivistä yleiskuva">
            <ChevronsUp size={12} /> Tiivistä
          </Mv2Button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0, 1fr)) 72px`,
          gridTemplateRows: `26px repeat(${dayNumbers.length || 1}, minmax(76px, auto))`,
          gap: 5,
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
              <span style={{ fontFamily: "ui-monospace, JetBrains Mono, monospace", fontSize: 10, color: sel ? "var(--accent-fg)" : "var(--fg-2)", fontWeight: 600, letterSpacing: "0.02em" }}>
                VK{w.week_number}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: sel ? "var(--fg-0)" : "var(--fg-1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {w.name?.trim() || `Viikko ${w.week_number}`}
              </span>
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
            completion={completion}
            showCompletion={showCompletion}
            selWeekId={selWeekId}
            selDayId={selDayId}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}

function Legend({ dot, square, children }: { dot?: string; square?: boolean; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: square ? 2 : "50%",
          background: square ? "rgba(255,255,255,0.12)" : dot,
        }}
      />
      {children}
    </span>
  );
}

function DayRow({
  dayNumber,
  weeks,
  completion,
  showCompletion,
  selWeekId,
  selDayId,
  onPick,
}: {
  dayNumber: number;
  weeks: Week[];
  completion: ProgramCompletion | undefined;
  showCompletion: boolean;
  selWeekId: string | null;
  selDayId: string | null;
  onPick: (weekId: string, dayId: string) => void;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "var(--fg-3)",
          fontWeight: 700,
          letterSpacing: "0.05em",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        T{dayNumber}
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
        const status = dayStatus(d.id, completion, showCompletion);
        return (
          <OverviewCell
            key={d.id}
            day={d}
            week={w}
            completion={completion}
            selected={selected}
            status={status}
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
  week,
  completion,
  selected,
  status,
  onClick,
}: {
  day: Day;
  week: Week;
  completion: ProgramCompletion | undefined;
  selected: boolean;
  status: "done" | "today" | "future";
  onClick: () => void;
}) {
  const c = dayColor(day.day_number);
  const isFuture = status === "future";
  const isDone = status === "done";
  const peLogs = logsByPe(completion, day.id);
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? c.bg : "var(--bg-2)",
        border: `1px solid ${selected ? c.fg : "var(--line)"}`,
        borderLeft: `3px solid ${c.fg}`,
        borderRadius: 7,
        padding: "7px 9px 8px 10px",
        cursor: "pointer",
        opacity: isFuture ? 0.85 : 1,
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
          justifyContent: "space-between",
          alignItems: "center",
          gap: 5,
          paddingBottom: 4,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          style={{
            fontSize: 11,
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
        {isDone && (
          <span
            style={{
              flex: "0 0 auto",
              color: "var(--green)",
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Check size={9} /> TEHTY
          </span>
        )}
        {status === "today" && (
          <span
            style={{
              flex: "0 0 auto",
              color: "var(--accent-fg)",
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            ● TÄNÄÄN
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {day.program_exercises.map((ex) => (
          <OverviewExerciseRow
            key={ex.id}
            ex={ex}
            accent={c.fg}
            isDone={isDone}
            logs={peLogs.get(ex.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function OverviewExerciseRow({
  ex,
  accent,
  isDone,
  logs,
}: {
  ex: ProgramExerciseRow;
  accent: string;
  isDone: boolean;
  logs: CompletedSet[];
}) {
  const cfgs = configsFromExercise(ex);
  const plannedLine = plannedSetsLine(cfgs);
  const exName = ex.exercises?.name ?? "—";
  const plannedColor = isDone ? "var(--fg-3)" : "var(--fg-2)";
  const hasLogs = isDone && logs.length > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.25 }}>
      <div style={{ fontSize: 10.5, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shortenExName(exName)}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, JetBrains Mono, monospace",
          fontSize: 9.5,
          color: plannedColor,
          lineHeight: 1.35,
        }}
      >
        {plannedLine}
      </div>
      {hasLogs && (
        <div
          style={{
            fontFamily: "ui-monospace, JetBrains Mono, monospace",
            fontSize: 9.5,
            color: accent,
            fontWeight: 600,
            lineHeight: 1.35,
          }}
        >
          <span style={{ marginRight: 3 }}>✓</span>
          {achievedSetsLine(logs)}
        </div>
      )}
    </div>
  );
}

// ── Compact phase ribbon ──────────────────────────────────────────────────────

function PhaseRibbon({
  weeks,
  completion,
  showCompletion,
  selWeekId,
  selDayId,
  onPick,
  onAddWeek,
  onExpand,
  onRequestDeleteWeek,
}: {
  weeks: Week[];
  completion: ProgramCompletion | undefined;
  showCompletion: boolean;
  selWeekId: string | null;
  selDayId: string | null;
  onPick: (weekId: string, dayId: string) => void;
  onAddWeek: () => void;
  onExpand: () => void;
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
      {/* Header — mirrors PhaseOverview so the toggle button stays in the same spot */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Jakson yleiskuva
          </span>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>tiivistetty · klikkaa solua avataksesi alle</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "var(--fg-3)" }}>
            <Legend dot="var(--green)">tehty</Legend>
            <Legend dot="var(--accent-fg)">tänään</Legend>
            <Legend square>tuleva</Legend>
          </div>
          <Mv2Button kind="ghost" size="sm" onClick={onExpand} title="Laajenna yleiskuva">
            <ChevronsDown size={12} /> Laajenna
          </Mv2Button>
        </div>
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
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, color: isSel ? "var(--accent-fg)" : "var(--fg-2)" }}>
                VK{w.week_number}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9.5, color: "var(--fg-3)" }}>
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
            <div style={{ fontSize: 11.5, fontWeight: 500, color: isSel ? "var(--fg-0)" : "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {w.name?.trim() || `Viikko ${w.week_number}`}
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
              {w.program_days.map((d) => {
                const c = dayColor(d.day_number);
                const status = dayStatus(d.id, completion, showCompletion);
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
                      height: 22,
                      borderRadius: 4,
                      background: c.bg,
                      border: `1px solid ${cellSel ? "var(--accent-fg)" : c.line}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      opacity: status === "future" ? 0.55 : 1,
                      cursor: "pointer",
                    }}
                    title={dayDisplayName(d)}
                  >
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8.5, color: c.fg, fontWeight: 600 }}>
                      {dayBadge(d)}
                    </span>
                    {status === "done" && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 1,
                          right: 1,
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "var(--green)",
                        }}
                      />
                    )}
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
  selDayId,
  completion,
  showCompletion,
  onSelect,
  onAddDay,
  onReorder,
}: {
  week: Week;
  selDayId: string | null;
  completion: ProgramCompletion | undefined;
  showCompletion: boolean;
  onSelect: (dayId: string) => void;
  onAddDay: () => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const sensors = useDndSensors();

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
    <ColumnShell
      title={`Vk ${week.week_number} — ${week.name?.trim() || `Viikko ${week.week_number}`}`}
      subtitle="TREENIT"
      action={
        <Mv2Button kind="ghost" size="sm" onClick={onAddDay}>
          <Plus size={11} /> Treeni
        </Mv2Button>
      }
      width={260}
    >
      {week.program_days.length === 0 && (
        <p style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>
          Ei treenejä. Lisää treeni ↑
        </p>
      )}
      <DndContext id={`mv2-days-${week.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SC items={week.program_days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {week.program_days.map((d) => (
            <SortableSessionRow
              key={d.id}
              day={d}
              selected={d.id === selDayId}
              completion={completion}
              showCompletion={showCompletion}
              onSelect={() => onSelect(d.id)}
            />
          ))}
        </SC>
      </DndContext>
    </ColumnShell>
  );
}

function SortableSessionRow({
  day,
  selected,
  completion,
  showCompletion,
  onSelect,
}: {
  day: Day;
  selected: boolean;
  completion: ProgramCompletion | undefined;
  showCompletion: boolean;
  onSelect: () => void;
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
  const status = dayStatus(day.id, completion, showCompletion);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onSelect}
        className="mv2-row"
        style={{
          padding: "8px 10px",
          margin: "1px 4px",
          borderRadius: 7,
          background: selected ? "var(--accent-soft)" : "transparent",
          cursor: "pointer",
          borderLeft: `2px solid ${selected ? "var(--accent-fg)" : c.fg}`,
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
            width: 34,
            height: 34,
            borderRadius: 8,
            background: c.bg,
            border: `1px solid ${c.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
            position: "relative",
          }}
        >
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: c.fg, fontWeight: 700 }}>
            {dayBadge(day)}
          </span>
          {status === "done" && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "var(--green)",
                border: "2px solid var(--bg-1)",
              }}
            />
          )}
          {status === "today" && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "var(--accent-fg)",
                border: "2px solid var(--bg-1)",
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {dayDisplayName(day)}
          </div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--fg-3)", marginTop: 1 }}>
            {day.program_exercises.length} liikettä · {cfgs} sarjaa
          </div>
        </div>
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
}: {
  day: Day;
  selExIdx: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  onReorder: (orderedIds: string[]) => void;
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
      title={dayDisplayName(day)}
      subtitle={`T${day.day_number}`}
      titleColor={c.fg}
      action={
        <Mv2Button kind="ghost" size="sm" onClick={onAdd}>
          <Plus size={11} /> Liike
        </Mv2Button>
      }
      width={250}
    >
      {day.program_exercises.length === 0 && (
        <p style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>
          Ei liikkeitä.
        </p>
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
}: {
  pe: ProgramExerciseRow;
  idx: number;
  selected: boolean;
  accentFg: string;
  onSelect: () => void;
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
          padding: "8px 10px",
          margin: "1px 4px",
          borderRadius: 7,
          background: selected ? "var(--accent-soft)" : "transparent",
          cursor: "pointer",
          borderLeft: `2px solid ${selected ? "var(--accent-fg)" : accentFg}`,
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
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--fg-3)", width: 16 }}>
          {idx + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--fg-3)", marginTop: 1 }}>
            {summary}
          </div>
        </div>
        <ChevronRight size={13} style={{ color: selected ? "var(--accent-fg)" : "var(--fg-3)" }} />
      </div>
    </div>
  );
}

function ColumnShell({
  title,
  subtitle,
  titleColor,
  action,
  width,
  children,
}: {
  title: string;
  subtitle?: string;
  titleColor?: string;
  action?: ReactNode;
  width: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width,
        flex: "0 0 auto",
        borderRight: "1px solid var(--line)",
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "13px 14px 11px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {subtitle && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {subtitle}
              </div>
            )}
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: titleColor || "var(--fg-0)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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

function ExerciseDetail({
  programId,
  ex,
  day,
  week,
  block,
  idx,
  total,
  completion,
  showProgression,
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
  showProgression: boolean;
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
  const rpes = cfgs.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
  const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : "—";

  return (
    <div style={{ padding: "20px 26px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--fg-3)" }}>
        <span>
          Vk {week.week_number} · {week.name?.trim() || `Viikko ${week.week_number}`}
        </span>
        <span>›</span>
        <span style={{ color: c.fg }}>{dayDisplayName(day)}</span>
        <span>›</span>
        <span style={{ color: "var(--fg-1)" }}>
          Liike {idx + 1}/{total}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
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
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                background: "none",
                border: "none",
                color: "inherit",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              {ex.exercises.name}
            </button>
          )}
          <div style={{ color: "var(--fg-2)", fontSize: 12, marginTop: 5, display: "flex", gap: 14 }}>
            <span>
              <b style={{ color: "var(--fg-1)" }}>{cfgs.length}</b> sarjaa
            </span>
            <span>
              <b style={{ color: "var(--fg-1)" }}>{totalReps}</b> toistoa yht.
            </span>
            <span>
              keskim. RPE <b style={{ color: c.fg }}>{avgRpe}</b>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Mv2Button kind="ghost" size="sm" onClick={onPrev} disabled={idx === 0}>
            <ChevronsLeft size={12} /> Edell.
          </Mv2Button>
          <Mv2Button kind="ghost" size="sm" onClick={onNext} disabled={idx >= total - 1}>
            Seur. <ChevronsRight size={12} />
          </Mv2Button>
          <div style={{ width: 1, height: 22, background: "var(--line)", alignSelf: "center" }} />
          <Mv2Button kind="ghost" size="sm" onClick={onOpenPicker}>
            Korvaa
          </Mv2Button>
          <Mv2Button kind="ghost" size="sm">
            <MoreHorizontal size={12} />
          </Mv2Button>
        </div>
      </div>

      {/* Three-week comparison */}
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div style={{ flex: "0 0 154px", minWidth: 0 }}>
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
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
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
        <div style={{ flex: "0 0 154px", minWidth: 0 }}>
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

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: showProgression ? "1fr 1fr" : "1fr", gap: 14 }}>
        {showProgression && (
          <div
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "14px 16px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Progressio · työsarjan kuorma
              </div>
              <ProgressionDelta block={block} day={day} ex={ex} accent={c.fg} />
            </div>
            <ProgressionBars block={block} day={day} ex={ex} currentWeek={week.week_number} accent={c.fg} />
          </div>
        )}
        <div
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>
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
              borderRadius: 6,
              color: "var(--fg-1)",
              fontSize: 12.5,
              lineHeight: 1.55,
              padding: "8px 10px",
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Chip>
              <Video size={11} /> Videolinkki
            </Chip>
            <Chip>
              <Paperclip size={11} /> Liite
            </Chip>
            <Chip>+ Variaatio</Chip>
          </div>
        </div>
      </div>
    </div>
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
              onMouseEnter={(ev) => (ev.currentTarget.style.background = "rgba(255,255,255,0.04)")}
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 999,
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        color: "var(--fg-2)",
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      {children}
    </span>
  );
}

// ── Current week — editable table ─────────────────────────────────────────────

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
        <span style={{ fontSize: 10, fontWeight: 700, color: c.fg, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Vk {week.week_number} · Nykyinen
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
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                />
              ))}
              <tr style={{ borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}>
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
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-2)",
          color: "var(--fg-3)",
          fontSize: 11,
        }}
      >
        <span>
          Tempo {ex.intensity_type ?? "—"} · Tauko {ex.rest_sec ? `${Math.floor(ex.rest_sec / 60)}:${String(ex.rest_sec % 60).padStart(2, "0")}` : "—"}
        </span>
        <Mv2Button kind="ghost" size="sm">
          Muokkaa lisäkenttiä →
        </Mv2Button>
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
}: {
  rowId: string;
  s: SetConfig;
  idx: number;
  isLast: boolean;
  canDelete: boolean;
  accentFg: string;
  onChange: (p: Partial<SetConfig>) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: rowId });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderBottom: isLast ? "none" : "1px solid var(--line)",
    background: isDragging ? "rgba(255,255,255,0.04)" : undefined,
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
          defaultValue={s.reps ?? ""}
          type="number"
          onCommit={(v) => onChange({ reps: v.trim() || null })}
        />
      </td>
      <td style={{ padding: "6px 10px", position: "relative" }}>
        <CellInput
          key={`w-${idx}-${s.weight ?? ""}`}
          defaultValue={s.weight ?? ""}
          type="number"
          rightAdorn="kg"
          onCommit={(v) => onChange({ weight: v ? Number(v) : null })}
        />
      </td>
      <td style={{ padding: "6px 10px" }}>
        <CellInput
          key={`rpe-${idx}-${s.rpe ?? ""}`}
          defaultValue={s.rpe ?? ""}
          type="number"
          onCommit={(v) => onChange({ rpe: v ? Number(v) : null })}
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

function CellInput({
  defaultValue,
  type,
  rightAdorn,
  onCommit,
  textColor,
  bold,
}: {
  defaultValue: string | number;
  type?: string;
  rightAdorn?: string;
  onCommit: (v: string) => void;
  textColor?: string;
  bold?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        defaultValue={defaultValue}
        type={type}
        placeholder="—"
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        style={{
          width: "100%",
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
  const summary = ex ? `${repsLabel(cfgs)} ${rpeLabel(cfgs)}` : null;

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
              {cfgs.length} sarjaa
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cfgs.map((s, i) => (
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

// ── Progression bars ──────────────────────────────────────────────────────────

function ProgressionBars({
  block,
  day,
  ex,
  currentWeek,
  accent,
}: {
  block: Block;
  day: Day;
  ex: ProgramExerciseRow;
  currentWeek: number;
  accent: string;
}) {
  const data = block.program_weeks.map((w) => {
    const d = w.program_days.find((dx) => dx.day_number === day.day_number);
    const e = d?.program_exercises.find((pe) =>
      ex.exercise_id ? pe.exercise_id === ex.exercise_id : pe.exercises?.name === ex.exercises?.name
    );
    const cfgs = e ? configsFromExercise(e) : [];
    const top = cfgs.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
    return { num: w.week_number, w: top };
  });
  const max = Math.max(...data.map((d) => d.w), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
      {data.map((d) => {
        const h = (d.w / max) * 100;
        const cur = d.num === currentWeek;
        const past = d.num < currentWeek;
        return (
          <div key={d.num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                fontWeight: 600,
                color: cur ? accent : past ? "var(--fg-1)" : "var(--fg-3)",
              }}
            >
              {d.w || "—"}
            </div>
            <div
              style={{
                width: "100%",
                height: 64,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 3,
                position: "relative",
                display: "flex",
                alignItems: "flex-end",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: h + "%",
                  background: cur ? accent : past ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.10)",
                  borderRadius: 2,
                  transition: "height 0.3s",
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 9,
                color: cur ? accent : "var(--fg-3)",
                fontWeight: cur ? 600 : 400,
              }}
            >
              vk{d.num}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressionDelta({
  block,
  day,
  ex,
  accent,
}: {
  block: Block;
  day: Day;
  ex: ProgramExerciseRow;
  accent: string;
}) {
  const tops: number[] = [];
  for (const w of block.program_weeks) {
    const d = w.program_days.find((dx) => dx.day_number === day.day_number);
    const e = d?.program_exercises.find((pe) =>
      ex.exercise_id ? pe.exercise_id === ex.exercise_id : pe.exercises?.name === ex.exercises?.name
    );
    const cfgs = e ? configsFromExercise(e) : [];
    const top = cfgs.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
    tops.push(top);
  }
  const nonZero = tops.filter((n) => n > 0);
  if (nonZero.length < 2) {
    return (
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--fg-3)" }}>—</div>
    );
  }
  const delta = nonZero[nonZero.length - 1]! - nonZero[0]!;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "ui-monospace, monospace", fontSize: 11, color: accent }}>
      <TrendingUp size={11} />
      {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} kg / {block.program_weeks.length} vk
    </div>
  );
}

// ── Summary rail ──────────────────────────────────────────────────────────────

function SummaryRail({
  week,
  block,
  onDuplicateWeek,
}: {
  week: Week;
  block: Block;
  onDuplicateWeek: () => void;
}) {
  const totalSets = week.program_days.reduce(
    (a, d) => a + d.program_exercises.reduce((b, e) => b + configsFromExercise(e).length, 0),
    0
  );
  const totalEx = week.program_days.reduce((a, d) => a + d.program_exercises.length, 0);
  const totalReps = week.program_days.reduce(
    (a, d) =>
      a +
      d.program_exercises.reduce(
        (b, e) =>
          b +
          configsFromExercise(e).reduce((c, s) => c + (s.reps ? parseInt(s.reps, 10) || 0 : 0), 0),
        0
      ),
    0
  );

  const nextWeekNum = (block.program_weeks[block.program_weeks.length - 1]?.week_number ?? week.week_number) + 1;

  return (
    <div
      style={{
        width: 230,
        flex: "0 0 auto",
        borderLeft: "1px solid var(--line)",
        background: "var(--bg-1)",
        padding: "16px 14px",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Viikko {week.week_number}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
          {week.name?.trim() || `Viikko ${week.week_number}`}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatTile label="Treenejä" value={week.program_days.length} />
        <StatTile label="Liikkeitä" value={totalEx} />
        <StatTile label="Sarjoja" value={totalSets} />
        <StatTile label="Toistoja" value={totalReps} />
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 9 }}>
          Volyymijakauma
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {week.program_days.map((d) => {
            const c = dayColor(d.day_number);
            const sets = d.program_exercises.reduce((a, e) => a + configsFromExercise(e).length, 0);
            const pct = totalSets > 0 ? (sets / totalSets) * 100 : 0;
            return (
              <div key={d.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
                  <span style={{ fontFamily: "ui-monospace, monospace", color: c.fg }}>
                    {dayBadge(d)} · {dayDisplayName(d).slice(0, 14)}
                  </span>
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--fg-2)" }}>
                    {sets} sarjaa
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: pct + "%", height: "100%", background: c.fg, opacity: 0.7 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 9 }}>
          Pikatoiminnot
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <RailButton onClick={onDuplicateWeek}>
            <Copy size={12} /> Monista viikoksi {nextWeekNum}
          </RailButton>
          <RailButton>
            <TrendingUp size={12} /> Lisää 2.5 % painoja
          </RailButton>
          <RailButton>↓ Muunna deloadiksi</RailButton>
          <RailButton>
            <ClipboardList size={12} /> Vie PDF
          </RailButton>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "9px 11px",
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function RailButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 6,
        padding: "7px 10px",
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        color: "var(--fg-1)",
        fontSize: 12,
        fontFamily: "inherit",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
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
        gap: 10,
        color: "var(--fg-3)",
        fontSize: 13,
      }}
    >
      Ei liikkeitä tässä treenissä.
      <Mv2Button kind="ghost" size="sm" onClick={onAdd}>
        <Plus size={12} /> Lisää liike
      </Mv2Button>
    </div>
  );
}

// ── Global style hooks ────────────────────────────────────────────────────────

function Mv2Style() {
  return (
    <style>{`
      .mv2 .mv2-row { transition: background 0.12s; }
      .mv2 .mv2-row:hover { background: rgba(255,255,255,0.03); }
      .mv2 .mv2-row .mv2-grip { opacity: 0; transition: opacity 0.12s; }
      .mv2 .mv2-row:hover .mv2-grip { opacity: 1; }
      .mv2 input::-webkit-outer-spin-button, .mv2 input::-webkit-inner-spin-button {
        -webkit-appearance: none; margin: 0;
      }
      .mv2 input[type=number] { -moz-appearance: textfield; }
      .mv2 button:not(:disabled):hover { filter: brightness(1.1); }
      .mv2 .mv2-week-del { opacity: 0.45; transition: opacity 0.12s, background 0.12s, color 0.12s; }
      .mv2 .mv2-week-head:hover .mv2-week-del,
      .mv2 .mv2-week-del:hover,
      .mv2 .mv2-week-del:focus-visible { opacity: 1; }
      .mv2 .mv2-week-del:hover { background: rgba(255,90,90,0.12) !important; color: #ff6b6b !important; }
    `}</style>
  );
}
