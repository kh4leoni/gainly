import { describe, it, expect } from "vitest";
import { bigThreeE1rmFromSelection } from "@/lib/powerlifting";

describe("bigThreeE1rmFromSelection", () => {
  const e1rm = new Map([["sq", 200], ["bp", 140]]);

  it("maps each picked exercise to its e1RM, unpicked -> null", () => {
    expect(bigThreeE1rmFromSelection({ squat: "sq", bench: "bp", dead: null }, e1rm))
      .toEqual({ squat: 200, bench: 140, dead: null });
  });

  it("picked exercise with no e1RM data -> null", () => {
    expect(bigThreeE1rmFromSelection({ squat: "missing", bench: null, dead: null }, e1rm).squat)
      .toBeNull();
  });

  it("accepts a plain record too", () => {
    expect(bigThreeE1rmFromSelection({ squat: "sq", bench: null, dead: null }, { sq: 180 }).squat)
      .toBe(180);
  });
});
