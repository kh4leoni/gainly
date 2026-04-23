import { describe, it, expect } from "vitest";
import { cn, avatarColor, formatDate, relativeTime, uuid } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("handles conditional classes", () => {
    const isActive = false;
    const isDisabled: false | string = false;
    const result = cn("text-red-500", isActive && "bg-blue-500", isDisabled && "bg-green-500");
    expect(result).toBe("text-red-500");
  });

  it("handles clsx objects", () => {
    const result = cn({ "text-red-500": true, "bg-blue-500": false });
    expect(result).toBe("text-red-500");
  });
});

describe("avatarColor", () => {
  it("returns a valid gradient class", () => {
    const result = avatarColor("Test User");
    expect(result).toMatch(/^from-pink-500 to-rose-400|from-violet-500 to-purple-400|from-sky-500 to-blue-400|from-emerald-500 to-green-400|from-amber-500 to-orange-400|from-teal-500 to-cyan-400$/);
  });

  it("is deterministic (same input = same output)", () => {
    expect(avatarColor("Test User")).toBe(avatarColor("Test User"));
  });

  it("produces spread across available colors with enough names", () => {
    const colors = new Set([
      avatarColor("Alice"),
      avatarColor("Bob"),
      avatarColor("Charlie"),
      avatarColor("Diana"),
      avatarColor("Eve"),
      avatarColor("Frank"),
    ]);
    // With 6 colors, 6 different names should produce at least 2 distinct colors
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-04-23");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("accepts custom Intl options", () => {
    const result = formatDate("2026-04-23", { dateStyle: "long" });
    expect(result).toBeTruthy();
  });
});

describe("relativeTime", () => {
  it("returns seconds for recent dates", () => {
    const now = Date.now();
    const result = relativeTime(new Date(now - 30_000).toISOString());
    expect(result).toContain("second");
  });

  it("returns minutes for older dates", () => {
    const now = Date.now();
    const result = relativeTime(new Date(now - 120_000).toISOString());
    expect(result).toContain("minute");
  });

  it("returns hours for even older dates", () => {
    const now = Date.now();
    const result = relativeTime(new Date(now - 3_600_000).toISOString());
    expect(result).toContain("hour");
  });

  it("returns days for old dates", () => {
    const result = relativeTime(new Date(Date.now() - 86_400_000).toISOString());
    expect(result).toContain("day");
  });
});

describe("uuid", () => {
  it("generates a valid UUID v4 format", () => {
    const result = uuid();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generates unique UUIDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()));
    expect(ids.size).toBe(100);
  });
});
