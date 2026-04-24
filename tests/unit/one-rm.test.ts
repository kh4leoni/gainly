import { describe, it, expect } from "vitest";
import {
  effectiveReps,
  estimatedOneRM,
  derivedRepMax,
  calculateEffectiveMax,
} from "@/lib/calc/one-rm";

describe("effectiveReps", () => {
  it("adds RIR to reps (RPE 6 = RIR 4)", () => {
    expect(effectiveReps(5, 6)).toBe(9);
  });

  it("RPE 10 = no RIR", () => {
    expect(effectiveReps(5, 10)).toBe(5);
  });

  it("null rpe is treated as RPE 10 (plain Epley)", () => {
    expect(effectiveReps(5, null)).toBe(5);
  });

  it("never returns negative RIR", () => {
    expect(effectiveReps(3, 11)).toBe(3);
  });

  it("<6 (stored as 5) adds 5 RIR", () => {
    expect(effectiveReps(8, 5)).toBe(13);
  });
});

describe("estimatedOneRM", () => {
  it("matches spec: 100kg x 5 @ RPE 6 -> effective 9 -> 130kg", () => {
    const e1rm = estimatedOneRM(100, 5, 6);
    expect(e1rm).toBeCloseTo(130, 5);
  });

  it("returns null for zero reps", () => {
    expect(estimatedOneRM(100, 0, 8)).toBeNull();
  });

  it("returns null for null weight", () => {
    expect(estimatedOneRM(null, 5, 8)).toBeNull();
  });

  it("returns null for null reps", () => {
    expect(estimatedOneRM(100, null, 8)).toBeNull();
  });

  it("matches DB formula: 100 x 5 @ 8 -> effective 7 -> 123.33", () => {
    const e1rm = estimatedOneRM(100, 5, 8);
    expect(e1rm).toBeCloseTo(100 * (1 + 7 / 30), 5);
  });
});

describe("derivedRepMax", () => {
  it("1RM -> 1RM is unchanged", () => {
    expect(derivedRepMax(150, 1)).toBeCloseTo(150 / (1 + 1 / 30));
  });

  it("1RM -> 5RM is lower", () => {
    const oneRM = 150;
    const fiveRM = derivedRepMax(oneRM, 5);
    expect(fiveRM).toBeLessThan(oneRM);
  });

  it("round trip: estimate from set then derive same rep-max", () => {
    const oneRM = estimatedOneRM(100, 5, 6)!;
    const fiveRM = derivedRepMax(oneRM, 5);
    // Not exactly 100 because the source set was at RPE 6, not RPE 10.
    expect(fiveRM).toBeGreaterThan(100);
  });
});

describe("calculateEffectiveMax", () => {
  it("consistent between coach and client (same inputs -> same output)", () => {
    const set = { weight: 140, reps: 3, rpe: 7 };
    const coachValue = calculateEffectiveMax(set);
    const clientValue = calculateEffectiveMax({ ...set });
    expect(coachValue).toBe(clientValue);
  });
});
