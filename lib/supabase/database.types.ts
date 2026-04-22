// Generated-style types. Regenerate with `npm run db:types` once a Supabase project is linked.
// Hand-written here to keep the app type-safe before generation.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Role = "coach" | "client";
export type IntensityType = "percent_1rm" | "rpe" | "kg" | "bw";
export type WorkoutStatus = "pending" | "completed" | "skipped";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Role;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: Role;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      coach_clients: {
        Row: {
          coach_id: string;
          client_id: string;
          status: "active" | "inactive" | "pending";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["coach_clients"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["coach_clients"]["Insert"]>;
      };
      exercises: {
        Row: {
          id: string;
          created_by: string | null;
          name: string;
          instructions: string | null;
          video_path: string | null;
          muscle_groups: string[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exercises"]["Row"], "id" | "created_at" | "muscle_groups"> & {
          id?: string;
          created_at?: string;
          muscle_groups?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
      };
      programs: {
        Row: {
          id: string;
          coach_id: string;
          client_id: string | null;
          title: string;
          description: string | null;
          is_template: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["programs"]["Row"], "id" | "is_template" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
      };
      program_weeks: {
        Row: { id: string; program_id: string; week_number: number; description: string | null; is_active: boolean };
        Insert: { id?: string; program_id: string; week_number: number; description?: string | null; is_active?: boolean };
        Update: Partial<Database["public"]["Tables"]["program_weeks"]["Insert"]>;
      };
      program_days: {
        Row: { id: string; week_id: string; day_number: number; name: string | null; description: string | null };
        Insert: { id?: string; week_id: string; day_number: number; name?: string | null; description?: string | null };
        Update: Partial<Database["public"]["Tables"]["program_days"]["Insert"]>;
      };
      program_exercises: {
        Row: {
          id: string;
          day_id: string;
          exercise_id: string | null;
          order_idx: number;
          sets: number | null;
          reps: string | null;
          intensity: number | null;
          intensity_type: IntensityType | null;
          target_rpe: number | null;
          rest_sec: number | null;
          notes: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["program_exercises"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["program_exercises"]["Insert"]>;
      };
      scheduled_workouts: {
        Row: {
          id: string;
          program_id: string | null;
          day_id: string | null;
          client_id: string;
          scheduled_date: string;
          status: WorkoutStatus;
          completed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["scheduled_workouts"]["Row"], "id" | "status" | "completed_at"> & {
          id?: string;
          status?: WorkoutStatus;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["scheduled_workouts"]["Insert"]>;
      };
      workout_logs: {
        Row: {
          id: string;
          scheduled_workout_id: string | null;
          client_id: string;
          logged_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workout_logs"]["Row"], "id" | "logged_at"> & {
          id?: string;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_logs"]["Insert"]>;
      };
      set_logs: {
        Row: {
          id: string;
          workout_log_id: string;
          program_exercise_id: string | null;
          exercise_id: string;
          set_number: number | null;
          weight: number | null;
          reps: number | null;
          rpe: number | null;
          is_pr: boolean;
          estimated_1rm: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["set_logs"]["Row"], "id" | "is_pr" | "estimated_1rm"> & {
          id?: string;
          is_pr?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["set_logs"]["Insert"]>;
      };
      personal_records: {
        Row: {
          id: string;
          client_id: string;
          exercise_id: string;
          rep_range: string;
          weight: number | null;
          reps: number | null;
          estimated_1rm: number | null;
          set_log_id: string | null;
          achieved_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["personal_records"]["Row"], "id" | "achieved_at"> & {
          id?: string;
          achieved_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["personal_records"]["Insert"]>;
      };
      threads: {
        Row: {
          id: string;
          coach_id: string;
          client_id: string;
          last_message_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["threads"]["Row"], "id" | "last_message_at"> & {
          id?: string;
          last_message_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["threads"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at" | "read_at"> & {
          id?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      invitations: {
        Row: {
          id: string;
          coach_id: string;
          email: string;
          invited_name: string | null;
          token: string;
          status: "pending" | "accepted";
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          coach_id: string;
          email: string;
          invited_name?: string | null;
          token?: string;
          status?: "pending" | "accepted";
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
      };
    };
    Functions: {
      coach_dashboard: {
        Args: { _coach?: string };
        Returns: Array<{
          client_id: string;
          full_name: string | null;
          avatar_url: string | null;
          today_status: WorkoutStatus | null;
          today_workout_id: string | null;
          unread_count: number;
          last_pr_at: string | null;
        }>;
      };
      one_rm_curve: {
        Args: { _client: string; _exercise: string; _days?: number };
        Returns: Array<{ day: string; best_1rm: number }>;
      };
      schedule_program: {
        Args: { _program: string; _client: string; _start_date: string };
        Returns: number;
      };
      copy_program: {
        Args: { _source: string; _client: string };
        Returns: string;
      };
      accept_invitation: {
        Args: { _token: string };
        Returns: void;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
