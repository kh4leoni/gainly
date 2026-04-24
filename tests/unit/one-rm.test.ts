import { describe, it, expect } from "vitest";
import {
  intensityPct,
  calculate1RM,
  derivedRepMax,
  calculateEffectiveMax,
  roundTo,
} from "@/lib/calc/one-rm";

describe("intensityPct (RTS/Tuchscherer table)", () => {
  it("3 reps @ RPE 7 -> 83.7 %", () => {
    expect(intensityPct(3, 7)).toBeCloseTo(83.7, 6);
  });

  it("1 rep @ RPE 10 -> exactly 100 %", () => {
    expect(intensityPct(1, 10)).toBe(100);
  });

  it("5 reps @ RPE 8 -> 81.1 %", () => {
    expect(intensityPct(5, 8)).toBeCloseTo(81.1, 6);
  });

  it("null rpe treated as RPE 10", () => {
    expect(intensityPct(3, null)).toBeCloseTo(92.2, 6);
  });

  it("falls back to Lennart Mai for reps out of table", () => {
    // reps = 15 -> not in grid, Lennart Mai fallback, no table exception
    const v = intensityPct(15, 10);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
  });
});

describe("calculate1RM", () => {
  it("benchmark: 220kg x 3 @ RPE 7 ~= 263kg", () => {
    const e1rm = calculate1RM(220, 3, 7);
    expect(e1rm).not.toBeNull();
    expect(e1rm!).toBeGreaterThanOrEqual(262);
    expect(e1rm!).toBeLessThanOrEqual(264);
  });

  it("edge: 1 rep @ RPE 10 equals the load", () => {
    expect(calculate1RM(150, 1, 10)).toBe(150);
  });

  it("returns null for zero reps", () => {
    expect(calculate1RM(100, 0, 8)).toBeNull();
  });

  it("returns null for null weight", () => {
    expect(calculate1RM(null, 5, 8)).toBeNull();
  });

  it("returns null for null reps", () => {
    expect(calculate1RM(100, null, 8)).toBeNull();
  });
});

describe("derivedRepMax", () => {
  it("higher reps at same RPE 10 -> lower projected weight", () => {
    const oneRM = 200;
    const fiveRM = derivedRepMax(oneRM, 5, 10);
    expect(fiveRM).toBeLessThan(oneRM);
    expect(fiveRM).toBeCloseTo(200 * 86.3 / 100, 5);
  });

  it("reps = 1 @ RPE 10 returns the 1RM", () => {
    expect(derivedRepMax(150, 1, 10)).toBe(150);
  });
});

describe("calculateEffectiveMax", () => {
  it("stable between callers (same inputs -> same output)", () => {
    const set = { weight: 140, reps: 3, rpe: 7 };
    const a = calculateEffectiveMax(set);
    const b = calculateEffectiveMax({ ...set });
    expect(a).toBe(b);
  });
});

describe("roundTo", () => {
  it("rounds to 2.5 kg", () => {
    expect(roundTo(124.0, 2.5)).toBe(125);
    expect(roundTo(121.0, 2.5)).toBe(120);
  });

  it("rounds to 0.5 kg", () => {
    expect(roundTo(100.26, 0.5)).toBe(100.5);
  });
});
