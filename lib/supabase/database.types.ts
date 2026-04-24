export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      coach_clients: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          status: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          status?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          muscle_groups: string[]
          name: string
          video_path: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          muscle_groups?: string[]
          name: string
          video_path?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          muscle_groups?: string[]
          name?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          coach_id: string
          created_at: string
          email: string
          id: string
          invited_name: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          coach_id: string
          created_at?: string
          email: string
          id?: string
          invited_name?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          coach_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_name?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          client_id: string
          estimated_1rm: number | null
          exercise_id: string
          id: string
          reps: number
          set_log_id: string | null
          weight: number | null
        }
        Insert: {
          achieved_at?: string
          client_id: string
          estimated_1rm?: number | null
          exercise_id: string
          id?: string
          reps: number
          set_log_id?: string | null
          weight?: number | null
        }
        Update: {
          achieved_at?: string
          client_id?: string
          estimated_1rm?: number | null
          exercise_id?: string
          id?: string
          reps?: number
          set_log_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_set_log_id_fkey"
            columns: ["set_log_id"]
            isOneToOne: false
            referencedRelation: "set_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      program_blocks: {
        Row: {
          block_number: number
          description: string | null
          id: string
          name: string | null
          program_id: string
        }
        Insert: {
          block_number: number
          description?: string | null
          id?: string
          name?: string | null
          program_id: string
        }
        Update: {
          block_number?: number
          description?: string | null
          id?: string
          name?: string | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_blocks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_days: {
        Row: {
          day_number: number
          description: string | null
          id: string
          name: string | null
          week_id: string
        }
        Insert: {
          day_number: number
          description?: string | null
          id?: string
          name?: string | null
          week_id: string
        }
        Update: {
          day_number?: number
          description?: string | null
          id?: string
          name?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          day_id: string
          exercise_id: string | null
          id: string
          intensity: number | null
          intensity_type: string | null
          notes: string | null
          order_idx: number
          reps: string | null
          rest_sec: number | null
          set_configs: Json | null
          sets: number | null
          target_rpe: number | null
          target_rpes: Json | null
        }
        Insert: {
          day_id: string
          exercise_id?: string | null
          id?: string
          intensity?: number | null
          intensity_type?: string | null
          notes?: string | null
          order_idx: number
          reps?: string | null
          rest_sec?: number | null
          set_configs?: Json | null
          sets?: number | null
          target_rpe?: number | null
          target_rpes?: Json | null
        }
        Update: {
          day_id?: string
          exercise_id?: string | null
          id?: string
          intensity?: number | null
          intensity_type?: string | null
          notes?: string | null
          order_idx?: number
          reps?: string | null
          rest_sec?: number | null
          set_configs?: Json | null
          sets?: number | null
          target_rpe?: number | null
          target_rpes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          block_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string | null
          program_id: string
          week_number: number
        }
        Insert: {
          block_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          program_id: string
          week_number: number
        }
        Update: {
          block_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "program_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          client_id: string | null
          coach_id: string
          created_at: string
          description: string | null
          id: string
          is_template: boolean | null
          title: string
        }
        Insert: {
          client_id?: string | null
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          title: string
        }
        Update: {
          client_id?: string | null
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_workouts: {
        Row: {
          client_id: string
          completed_at: string | null
          day_id: string | null
          id: string
          program_id: string | null
          scheduled_date: string
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          day_id?: string | null
          id?: string
          program_id?: string | null
          scheduled_date: string
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          day_id?: string | null
          id?: string
          program_id?: string | null
          scheduled_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          estimated_1rm: number | null
          exercise_id: string
          id: string
          is_pr: boolean
          program_exercise_id: string | null
          reps: number | null
          rpe: number | null
          set_number: number | null
          weight: number | null
          workout_log_id: string
        }
        Insert: {
          estimated_1rm?: number | null
          exercise_id: string
          id?: string
          is_pr?: boolean
          program_exercise_id?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number | null
          weight?: number | null
          workout_log_id: string
        }
        Update: {
          estimated_1rm?: number | null
          exercise_id?: string
          id?: string
          is_pr?: boolean
          program_exercise_id?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number | null
          weight?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          client_id: string
          coach_id: string
          id: string
          last_message_at: string | null
        }
        Insert: {
          client_id: string
          coach_id: string
          id?: string
          last_message_at?: string | null
        }
        Update: {
          client_id?: string
          coach_id?: string
          id?: string
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_notes: {
        Row: {
          notes: string
          program_exercise_id: string
          workout_log_id: string
        }
        Insert: {
          notes?: string
          program_exercise_id: string
          workout_log_id: string
        }
        Update: {
          notes?: string
          program_exercise_id?: string
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_notes_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_notes_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          client_id: string
          id: string
          logged_at: string
          notes: string | null
          scheduled_workout_id: string | null
        }
        Insert: {
          client_id: string
          id?: string
          logged_at?: string
          notes?: string | null
          scheduled_workout_id?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          logged_at?: string
          notes?: string | null
          scheduled_workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_scheduled_workout_id_fkey"
            columns: ["scheduled_workout_id"]
            isOneToOne: false
            referencedRelation: "scheduled_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: {
          _token: string
        }
        Returns: undefined
      }
      can_access_program: {
        Args: {
          _program: string
        }
        Returns: boolean
      }
      can_modify_program: {
        Args: {
          _program: string
        }
        Returns: boolean
      }
      coach_dashboard: {
        Args: {
          _coach?: string
        }
        Returns: {
          client_id: string
          full_name: string
          avatar_url: string
          today_status: string
          today_workout_id: string
          unread_count: number
          last_pr_at: string
        }[]
      }
      copy_program: {
        Args: {
          _source: string
          _client: string
        }
        Returns: string
      }
      custom_access_token_hook: {
        Args: {
          event: Json
        }
        Returns: Json
      }
      is_client_of: {
        Args: {
          _coach: string
        }
        Returns: boolean
      }
      is_coach_of: {
        Args: {
          _client: string
        }
        Returns: boolean
      }
      one_rm_curve: {
        Args: {
          _client: string
          _exercise: string
          _days?: number
        }
        Returns: {
          day: string
          best_1rm: number
        }[]
      }
      recompute_pr_bucket: {
        Args: {
          p_client: string
          p_exercise: string
          p_reps: number
        }
        Returns: undefined
      }
      rts_intensity: {
        Args: {
          p_reps: number
          p_rpe: number
        }
        Returns: number
      }
      schedule_program: {
        Args: {
          _program: string
          _client: string
          _start_date: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

