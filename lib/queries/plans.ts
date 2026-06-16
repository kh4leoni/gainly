import type { DB } from "./types";

// ---------------------------------------------------------------------
// Plans (suunnitelmat) — freeform Excel-style progression scratchpads.
// The grid is a jsonb blob; see the migration for its shape.
// ---------------------------------------------------------------------

export type PlanRow = {
  id: string;
  exerciseId: string | null;
  label: string;
  cells: string[]; // one free-text value per week
};

export type PlanGrid = {
  weekLabels: string[];
  rows: PlanRow[];
};

export type PlanListItem = {
  id: string;
  title: string;
  weeks: number;
  client_id: string | null;
  updated_at: string;
};

export type PlanFull = {
  id: string;
  title: string;
  weeks: number;
  client_id: string | null;
  grid: PlanGrid;
  updated_at: string;
};

export function defaultWeekLabel(i: number): string {
  return `Vk ${i + 1}`;
}

// Coerce the loose jsonb into a well-formed grid, padding/truncating each row's
// cells to `weeks` so the UI never indexes past the end.
export function normalizeGrid(raw: unknown, weeks: number): PlanGrid {
  const g = (raw ?? {}) as Partial<PlanGrid>;
  const weekLabels = Array.from({ length: weeks }, (_, i) => g.weekLabels?.[i]?.toString() ?? defaultWeekLabel(i));
  const rows: PlanRow[] = (Array.isArray(g.rows) ? g.rows : []).map((r) => {
    const cells = Array.from({ length: weeks }, (_, i) => (r.cells?.[i] ?? "").toString());
    return {
      id: r.id ?? crypto.randomUUID(),
      exerciseId: r.exerciseId ?? null,
      label: (r.label ?? "").toString(),
      cells,
    };
  });
  return { weekLabels, rows };
}

export async function listPlans(supabase: DB, coachId: string): Promise<PlanListItem[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, title, weeks, client_id, updated_at")
    .eq("coach_id", coachId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlanListItem[];
}

export async function getPlan(supabase: DB, id: string): Promise<PlanFull | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, title, weeks, client_id, grid, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    weeks: data.weeks,
    client_id: data.client_id,
    updated_at: data.updated_at,
    grid: normalizeGrid(data.grid, data.weeks),
  };
}

export async function createPlan(supabase: DB, coachId: string): Promise<string> {
  const weeks = 4;
  const grid: PlanGrid = {
    weekLabels: Array.from({ length: weeks }, (_, i) => defaultWeekLabel(i)),
    rows: [{ id: crypto.randomUUID(), exerciseId: null, label: "", cells: Array(weeks).fill("") }],
  };
  const { data, error } = await supabase
    .from("plans")
    .insert({ coach_id: coachId, title: "Uusi suunnitelma", weeks, grid: grid as unknown as never })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("plan insert failed");
  return data.id;
}

export async function updatePlan(
  supabase: DB,
  id: string,
  patch: { title?: string; weeks?: number; client_id?: string | null; grid?: PlanGrid }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.weeks !== undefined) row.weeks = patch.weeks;
  if (patch.client_id !== undefined) row.client_id = patch.client_id;
  if (patch.grid !== undefined) row.grid = patch.grid;
  const { error } = await supabase.from("plans").update(row as never).eq("id", id);
  if (error) throw error;
}

export async function deletePlan(supabase: DB, id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}
