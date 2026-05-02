import { roundTo } from "@/lib/calc/one-rm";

export const ATTEMPT_MODES = {
  conservative: { label: "Turvallinen", pcts: [0.89, 0.94, 0.98] as const },
  normal:       { label: "Normaali",    pcts: [0.90, 0.955, 1.00] as const },
  risky:        { label: "Kova riski",  pcts: [0.915, 0.975, 1.03] as const },
} as const;
export type AttemptMode = keyof typeof ATTEMPT_MODES;

export const BIG_THREE = [
  { key: "squat", label: "Kyykky",         keywords: ["takakyykky", "kyykky"] },
  { key: "bench", label: "Penkkipunnerrus", keywords: ["penkkipunnerrus"] },
  { key: "dead",  label: "Maastaveto",      keywords: ["maastaveto"] },
] as const;
export type BigThreeKey = typeof BIG_THREE[number]["key"];

export function matchBigThree(name: string): BigThreeKey | null {
  const n = name.toLowerCase();
  for (const lift of BIG_THREE) {
    if (lift.keywords.some((k) => n.includes(k))) return lift.key;
  }
  return null;
}

export function calcAttempts(e1rm: number, pcts: readonly [number, number, number]) {
  return pcts.map((p) => roundTo(e1rm * p, 2.5));
}
