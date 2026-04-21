import { z } from "zod";

export const RoleSchema = z.enum(["coach", "client"]);
export type Role = z.infer<typeof RoleSchema>;

export const IntensityTypeSchema = z.enum(["percent_1rm", "rpe", "kg", "bw"]);
export type IntensityType = z.infer<typeof IntensityTypeSchema>;

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  full_name: z.string().min(1, "Required").max(120),
  role: RoleSchema,
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  instructions: z.string().max(4000).optional().nullable(),
  muscle_groups: z.array(z.string()).default([]),
  video_path: z.string().optional().nullable(),
});
export type ExerciseInput = z.infer<typeof ExerciseSchema>;

export const ProgramSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(4000).optional().nullable(),
  client_id: z.string().uuid().optional().nullable(), // null = template
});
export type ProgramInput = z.infer<typeof ProgramSchema>;

export const ProgramExerciseSchema = z.object({
  id: z.string().uuid().optional(),
  exercise_id: z.string().uuid(),
  order_idx: z.number().int().min(0),
  sets: z.number().int().positive().nullable().optional(),
  reps: z.string().max(20).nullable().optional(),
  intensity: z.number().nonnegative().nullable().optional(),
  intensity_type: IntensityTypeSchema.nullable().optional(),
  rest_sec: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type ProgramExerciseInput = z.infer<typeof ProgramExerciseSchema>;

export const SetLogSchema = z.object({
  id: z.string().uuid().optional(),
  workout_log_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  program_exercise_id: z.string().uuid().nullable().optional(),
  set_number: z.number().int().min(1).nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  rpe: z.number().min(0).max(10).nullable().optional(),
});
export type SetLogInput = z.infer<typeof SetLogSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid().optional(),
  thread_id: z.string().uuid(),
  content: z.string().min(1).max(4000),
});
export type MessageInput = z.infer<typeof MessageSchema>;
