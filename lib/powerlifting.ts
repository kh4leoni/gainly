import { roundTo } from "@/lib/calc/one-rm";

export const ATTEMPT_MODES = {
  conservative: { label: "Turvallinen", pcts: [0.89, 0.94, 0.98] as const },
  normal:       { label: "Normaali",    pcts: [0.90, 0.955, 1.00] as const },
  risky:        { label: "Kova riski",  pcts: [0.915, 0.975, 1.03] as const },
} as const;
export type AttemptMode = keyof typeof ATTEMPT_MODES;

export const BIG_THREE = [
  { key: "squat", label: "Kyykky" },
  { key: "bench", label: "Penkkipunnerrus" },
  { key: "dead",  label: "Maastaveto" },
] as const;
export type BigThreeKey = typeof BIG_THREE[number]["key"];

// Which exercise counts as each competition lift. Coach-set or client-set;
// no name guessing — the human who programmed the exercise decides.
export type CompSelection = Record<BigThreeKey, string | null>;

export function bigThreeE1rmFromSelection(
  selection: CompSelection,
  topE1rmByExerciseId: Map<string, number> | Record<string, number | null>,
): Record<BigThreeKey, number | null> {
  const get = (id: string | null) =>
    id == null ? null : (topE1rmByExerciseId instanceof Map
      ? topE1rmByExerciseId.get(id) ?? null
      : topE1rmByExerciseId[id] ?? null);
  return { squat: get(selection.squat), bench: get(selection.bench), dead: get(selection.dead) };
}

export function calcAttempts(e1rm: number, pcts: readonly [number, number, number]) {
  return pcts.map((p) => roundTo(e1rm * p, 2.5));
}
