// Single source of truth for 1RM / rep-max math.
// Mirror of the Postgres formula in supabase/migrations: keep these in sync.
//
//   RIR             = max(0, 10 - RPE)
//   effective reps  = actual reps + RIR
//   estimated 1RM   = weight * (1 + effective_reps / 30)       (Epley)
//   derived N-RM    = 1RM / (1 + N / 30)                       (inverse Epley)
//
// RPE semantics:
//   - null  → no RPE recorded, treat as RPE 10 so effective reps = reps (plain Epley).
//   - 5     → our representation of "<6" (UI label).
//   - 0..10 → direct value; effective reps = reps + (10 - rpe).

const EPLEY_DIVISOR = 30;

export function effectiveReps(reps: number, rpe: number | null | undefined): number {
  const r = rpe ?? 10;
  const rir = Math.max(0, 10 - r);
  return reps + rir;
}

export function estimatedOneRM(
  weight: number | null | undefined,
  reps: number | null | undefined,
  rpe: number | null | undefined,
): number | null {
  if (weight == null || reps == null || reps === 0) return null;
  return weight * (1 + effectiveReps(reps, rpe) / EPLEY_DIVISOR);
}

export function derivedRepMax(oneRM: number, n: number): number {
  if (n <= 0) return oneRM;
  return oneRM / (1 + n / EPLEY_DIVISOR);
}

export type RepMaxSet = {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

export function calculateEffectiveMax(set: RepMaxSet): number | null {
  return estimatedOneRM(set.weight, set.reps, set.rpe);
}

export function roundKg(value: number): number {
  return Math.round(value * 10) / 10;
}
