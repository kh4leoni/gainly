// Single source of truth for 1RM / rep-max math.
// Mirror of public.rts_intensity in supabase/migrations/20260426000000_pr_v3.sql:
// keep the table and fallback in sync.
//
// Formula (hybrid):
//   - Lookup the RTS/Tuchscherer intensity % for (reps, rpe) when reps in 1..12
//     and rpe in {6, 6.5, ..., 10}.
//   - Fall back to Lennart Mai formula when the grid misses:
//       x = reps + max(0, 10 - rpe)
//       intensity = 101.437 - 2.360 x - 0.0197 x^2
//   - 1RM = weight * 100 / intensity
//
// RPE semantics:
//   - null  → no RPE recorded, treat as RPE 10 (intensity table max).
//   - 5     → our representation of "<6" (UI label). Falls out of the table and
//             uses the Lennart Mai fallback, which matches the Epley-with-RIR
//             behaviour used previously for sub-6 loads.
//   - 6..10 (step 0.5) → direct table lookup.

const RTS_TABLE: Record<number, Record<number, number>> = {
  1:  { 6: 86.0, 6.5: 87.5, 7: 89.0, 7.5: 90.5, 8: 92.0, 8.5: 93.5, 9: 95.5, 9.5: 97.5, 10: 100.0 },
  2:  { 6: 83.7, 6.5: 85.0, 7: 86.5, 7.5: 88.0, 8: 89.5, 8.5: 91.0, 9: 92.2, 9.5: 93.9, 10: 95.5 },
  3:  { 6: 81.0, 6.5: 82.5, 7: 83.7, 7.5: 85.0, 8: 86.3, 8.5: 87.8, 9: 89.0, 9.5: 90.7, 10: 92.2 },
  4:  { 6: 78.7, 6.5: 79.9, 7: 81.1, 7.5: 82.4, 8: 83.7, 8.5: 85.0, 9: 86.3, 9.5: 87.8, 10: 89.0 },
  5:  { 6: 76.2, 6.5: 77.4, 7: 78.7, 7.5: 79.9, 8: 81.1, 8.5: 82.4, 9: 83.7, 9.5: 85.0, 10: 86.3 },
  6:  { 6: 73.9, 6.5: 75.1, 7: 76.2, 7.5: 77.4, 8: 78.7, 8.5: 79.9, 9: 81.1, 9.5: 82.4, 10: 83.7 },
  7:  { 6: 71.6, 6.5: 72.3, 7: 73.9, 7.5: 75.1, 8: 76.2, 8.5: 77.4, 9: 78.7, 9.5: 79.9, 10: 81.1 },
  8:  { 6: 69.4, 6.5: 70.5, 7: 71.6, 7.5: 72.3, 8: 73.9, 8.5: 75.1, 9: 76.2, 9.5: 77.4, 10: 78.7 },
  9:  { 6: 67.0, 6.5: 68.0, 7: 69.4, 7.5: 70.5, 8: 71.6, 8.5: 72.3, 9: 73.9, 9.5: 75.1, 10: 76.2 },
  10: { 6: 64.3, 6.5: 65.0, 7: 67.0, 7.5: 68.0, 8: 69.4, 8.5: 70.5, 9: 71.6, 9.5: 72.3, 10: 73.9 },
  11: { 6: 61.6, 6.5: 62.6, 7: 63.6, 7.5: 65.0, 8: 67.0, 8.5: 68.0, 9: 69.4, 9.5: 70.5, 10: 71.6 },
  12: { 6: 59.2, 6.5: 60.3, 7: 61.6, 7.5: 62.6, 8: 63.6, 8.5: 65.0, 9: 67.0, 9.5: 68.0, 10: 69.4 },
};

function lennartMai(reps: number, rpe: number): number {
  const x = reps + Math.max(0, 10 - rpe);
  const v = 101.437 - 2.36 * x - 0.0197 * x * x;
  return Math.max(v, 1);
}

export function intensityPct(reps: number, rpe: number | null | undefined): number {
  const r = rpe ?? 10;
  const row = RTS_TABLE[reps];
  if (row && row[r] != null) return row[r]!;
  return lennartMai(reps, r);
}

export function calculate1RM(
  weight: number | null | undefined,
  reps: number | null | undefined,
  rpe: number | null | undefined,
): number | null {
  if (weight == null || reps == null || reps === 0) return null;
  const intensity = intensityPct(reps, rpe);
  if (intensity <= 0) return null;
  return (weight * 100) / intensity;
}

/**
 * Weight that the athlete is projected to hit for `reps` at `rpe` given a known
 * 1RM. Default rpe = 10 returns the pure N-rep-max.
 */
export function derivedRepMax(
  oneRM: number,
  reps: number,
  rpe: number | null | undefined = 10,
): number {
  if (reps <= 0) return oneRM;
  return (oneRM * intensityPct(reps, rpe)) / 100;
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function roundKg(value: number): number {
  return Math.round(value * 10) / 10;
}

// -------- Back-compat wrappers used by existing call sites --------

/**
 * @deprecated kept for legacy call sites; returns reps + RIR (RPE 10 = reps).
 * Prefer `intensityPct` / `calculate1RM`.
 */
export function effectiveReps(reps: number, rpe: number | null | undefined): number {
  const r = rpe ?? 10;
  return reps + Math.max(0, 10 - r);
}

/** Alias for `calculate1RM`; kept so legacy imports compile. */
export function estimatedOneRM(
  weight: number | null | undefined,
  reps: number | null | undefined,
  rpe: number | null | undefined,
): number | null {
  return calculate1RM(weight, reps, rpe);
}

export type RepMaxSet = {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

export function calculateEffectiveMax(set: RepMaxSet): number | null {
  return calculate1RM(set.weight, set.reps, set.rpe);
}
