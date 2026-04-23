import { describe, it, expect } from "vitest";
import {
  RoleSchema,
  IntensityTypeSchema,
  SignupSchema,
  LoginSchema,
  ExerciseSchema,
  ProgramSchema,
  ProgramExerciseSchema,
  SetLogSchema,
  MessageSchema,
} from "@/lib/schemas";

describe("RoleSchema", () => {
  it("accepts valid roles", () => {
    expect(RoleSchema.parse("coach")).toBe("coach");
    expect(RoleSchema.parse("client")).toBe("client");
  });

  it("rejects invalid role", () => {
    expect(() => RoleSchema.parse("admin")).toThrow();
    expect(() => RoleSchema.parse("")).toThrow();
  });
});

describe("IntensityTypeSchema", () => {
  it("accepts all valid intensity types", () => {
    expect(IntensityTypeSchema.parse("percent_1rm")).toBe("percent_1rm");
    expect(IntensityTypeSchema.parse("rpe")).toBe("rpe");
    expect(IntensityTypeSchema.parse("kg")).toBe("kg");
    expect(IntensityTypeSchema.parse("bw")).toBe("bw");
  });

  it("rejects invalid intensity type", () => {
    expect(() => IntensityTypeSchema.parse("percent")).toThrow();
  });
});

describe("SignupSchema", () => {
  it("accepts valid signup input", () => {
    const input = {
      email: "test@example.com",
      password: "password123",
      full_name: "Test User",
      role: "client",
    };
    expect(SignupSchema.parse(input)).toEqual(input);
  });

  it("rejects short password", () => {
    const input = {
      email: "test@example.com",
      password: "short",
      full_name: "Test User",
      role: "coach",
    };
    expect(() => SignupSchema.parse(input)).toThrow();
  });

  it("rejects invalid email", () => {
    const input = {
      email: "not-an-email",
      password: "password123",
      full_name: "Test User",
      role: "client",
    };
    expect(() => SignupSchema.parse(input)).toThrow();
  });

  it("rejects missing full_name", () => {
    const input = {
      email: "test@example.com",
      password: "password123",
      role: "client",
    };
    expect(() => SignupSchema.parse(input)).toThrow();
  });

  it("rejects empty full_name", () => {
    const input = {
      email: "test@example.com",
      password: "password123",
      full_name: "",
      role: "client",
    };
    expect(() => SignupSchema.parse(input)).toThrow();
  });

  it("rejects invalid role", () => {
    const input = {
      email: "test@example.com",
      password: "password123",
      full_name: "Test User",
      role: "superuser",
    };
    expect(() => SignupSchema.parse(input)).toThrow();
  });
});

describe("LoginSchema", () => {
  it("accepts valid login input", () => {
    const input = { email: "test@example.com", password: "password123" };
    expect(LoginSchema.parse(input)).toEqual(input);
  });

  it("rejects invalid email", () => {
    expect(() => LoginSchema.parse({ email: "bad", password: "pass" })).toThrow();
  });

  it("rejects missing password", () => {
    expect(() => LoginSchema.parse({ email: "test@example.com" })).toThrow();
  });
});

describe("ExerciseSchema", () => {
  it("accepts valid exercise", () => {
    const input = {
      name: "Squat",
      instructions: "Go deep",
      muscle_groups: ["quads", "glutes"],
    };
    expect(ExerciseSchema.parse(input)).toEqual(input);
  });

  it("accepts minimal exercise (name only)", () => {
    expect(ExerciseSchema.parse({ name: "Squat" })).toEqual({ name: "Squat", muscle_groups: [] });
  });

  it("rejects empty name", () => {
    expect(() => ExerciseSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name too long", () => {
    expect(() => ExerciseSchema.parse({ name: "a".repeat(121) })).toThrow();
  });
});

describe("ProgramSchema", () => {
  it("accepts full program", () => {
    const input = {
      title: "Hypertrophy Block",
      description: "8 weeks of volume",
      client_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(ProgramSchema.parse(input)).toEqual(input);
  });

  it("accepts template program (no client_id)", () => {
    const input = { title: "Template Program" };
    // client_id and description are optional/nullable — parse passes them through as-is (no default)
    expect(ProgramSchema.parse(input)).toEqual({ title: "Template Program" });
  });

  it("rejects empty title", () => {
    expect(() => ProgramSchema.parse({ title: "" })).toThrow();
  });

  it("rejects invalid client_id format", () => {
    expect(() => ProgramSchema.parse({ title: "Test", client_id: "not-a-uuid" })).toThrow();
  });
});

describe("ProgramExerciseSchema", () => {
  it("accepts valid program exercise", () => {
    const input = {
      exercise_id: "550e8400-e29b-41d4-a716-446655440000",
      order_idx: 0,
      sets: 3,
      reps: "8-12",
      intensity: 75,
      intensity_type: "percent_1rm",
      rest_sec: 90,
    };
    expect(ProgramExerciseSchema.parse(input)).toEqual(input);
  });

  it("accepts minimal program exercise", () => {
    const input = {
      exercise_id: "550e8400-e29b-41d4-a716-446655440000",
      order_idx: 0,
    };
    expect(ProgramExerciseSchema.parse(input)).toEqual(input);
  });

  it("rejects negative order_idx", () => {
    const input = {
      exercise_id: "550e8400-e29b-41d4-a716-446655440000",
      order_idx: -1,
    };
    expect(() => ProgramExerciseSchema.parse(input)).toThrow();
  });

  it("rejects non-positive sets", () => {
    const input = {
      exercise_id: "550e8400-e29b-41d4-a716-446655440000",
      order_idx: 0,
      sets: 0,
    };
    expect(() => ProgramExerciseSchema.parse(input)).toThrow();
  });

  it("rejects negative intensity", () => {
    const input = {
      exercise_id: "550e8400-e29b-41d4-a716-446655440000",
      order_idx: 0,
      intensity: -5,
    };
    expect(() => ProgramExerciseSchema.parse(input)).toThrow();
  });

  it("rejects negative rest_sec", () => {
    const input = {
      exercise_id: "550e8400-e29b-41d4-a716-446655440000",
      order_idx: 0,
      rest_sec: -10,
    };
    expect(() => ProgramExerciseSchema.parse(input)).toThrow();
  });
});

describe("SetLogSchema", () => {
  it("accepts valid set log", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      weight: 100,
      reps: 5,
      rpe: 8,
    };
    expect(SetLogSchema.parse(input)).toEqual(input);
  });

  it("accepts minimal set log (only required fields)", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
    };
    expect(SetLogSchema.parse(input)).toEqual(input);
  });

  it("accepts optional id as UUID", () => {
    const input = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      workout_log_id: "550e8400-e29b-41d4-a716-446655440001",
      exercise_id: "550e8400-e29b-41d4-a716-446655440002",
    };
    expect(SetLogSchema.parse(input)).toEqual(input);
  });

  it("rejects negative weight", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      weight: -5,
    };
    expect(() => SetLogSchema.parse(input)).toThrow();
  });

  it("rejects negative reps", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      reps: -1,
    };
    expect(() => SetLogSchema.parse(input)).toThrow();
  });

  it("rejects rpe below 0", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      rpe: -1,
    };
    expect(() => SetLogSchema.parse(input)).toThrow();
  });

  it("rejects rpe above 10", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      rpe: 11,
    };
    expect(() => SetLogSchema.parse(input)).toThrow();
  });

  it("accepts rpe at boundary 0 and 10", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      rpe: 0,
    };
    expect(SetLogSchema.parse(input)).toBeTruthy();

    const input2 = { ...input, rpe: 10 };
    expect(SetLogSchema.parse(input2)).toBeTruthy();
  });

  it("rejects set_number below 1", () => {
    const input = {
      workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
      exercise_id: "550e8400-e29b-41d4-a716-446655440001",
      set_number: 0,
    };
    expect(() => ProgramExerciseSchema.parse(input)).toThrow();
  });
});

describe("MessageSchema", () => {
  it("accepts valid message", () => {
    const input = {
      thread_id: "550e8400-e29b-41d4-a716-446655440000",
      content: "Hey, how's the program going?",
    };
    expect(MessageSchema.parse(input)).toEqual(input);
  });

  it("accepts optional id", () => {
    const input = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      thread_id: "550e8400-e29b-41d4-a716-446655440001",
      content: "Hello",
    };
    expect(MessageSchema.parse(input)).toEqual(input);
  });

  it("rejects empty content", () => {
    const input = {
      thread_id: "550e8400-e29b-41d4-a716-446655440000",
      content: "",
    };
    expect(() => MessageSchema.parse(input)).toThrow();
  });

  it("rejects content too long", () => {
    const input = {
      thread_id: "550e8400-e29b-41d4-a716-446655440000",
      content: "a".repeat(4001),
    };
    expect(() => MessageSchema.parse(input)).toThrow();
  });

  it("rejects missing thread_id", () => {
    const input = { content: "Hello" };
    expect(() => MessageSchema.parse(input)).toThrow();
  });
});
