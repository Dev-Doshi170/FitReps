export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      body_weight_logs: {
        Row: {
          id: string
          logged_date: string
          user_id: string
          weight: number
        }
        Insert: {
          id?: string
          logged_date: string
          user_id: string
          weight: number
        }
        Update: {
          id?: string
          logged_date?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          equipment: string
          id: string
          muscle_primary: string
          muscle_secondary: string[]
          name: string
          notes: string | null
          type: string
        }
        Insert: {
          equipment?: string
          id?: string
          muscle_primary?: string
          muscle_secondary?: string[]
          name: string
          notes?: string | null
          type: string
        }
        Update: {
          equipment?: string
          id?: string
          muscle_primary?: string
          muscle_secondary?: string[]
          name?: string
          notes?: string | null
          type?: string
        }
        Relationships: []
      }
      plan_days: {
        Row: {
          cardio_duration_minutes: number | null
          cardio_instructions: string
          cardio_title: string
          day: string
          duration_minutes: number
          focus: string
          id: string
          plan_id: string
          type: string
          warmup: string
        }
        Insert: {
          cardio_duration_minutes?: number | null
          cardio_instructions?: string
          cardio_title?: string
          day: string
          duration_minutes: number
          focus: string
          id?: string
          plan_id: string
          type: string
          warmup?: string
        }
        Update: {
          cardio_duration_minutes?: number | null
          cardio_instructions?: string
          cardio_title?: string
          day?: string
          duration_minutes?: number
          focus?: string
          id?: string
          plan_id?: string
          type?: string
          warmup?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_exercises: {
        Row: {
          exercise_id: string
          id: string
          plan_day_id: string
          reps: string
          sets: number
          sort_order: number
        }
        Insert: {
          exercise_id: string
          id?: string
          plan_day_id: string
          reps: string
          sets: number
          sort_order: number
        }
        Update: {
          exercise_id?: string
          id?: string
          plan_day_id?: string
          reps?: string
          sets?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_exercises_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          days_per_week: number
          goal: string
          id: string
          level: string
          name: string
        }
        Insert: {
          days_per_week: number
          goal: string
          id?: string
          level: string
          name: string
        }
        Update: {
          days_per_week?: number
          goal?: string
          id?: string
          level?: string
          name?: string
        }
        Relationships: []
      }
      progression_state: {
        Row: {
          consecutive_easy_sessions: number | null
          consecutive_hard_sets: number | null
          current_reps_target: number | null
          current_weight: number | null
          exercise_name: string
          id: string
          last_session_rpe: string | null
          last_updated: string | null
          rep_range_max: number
          rep_range_min: number
          user_id: string
        }
        Insert: {
          consecutive_easy_sessions?: number | null
          consecutive_hard_sets?: number | null
          current_reps_target?: number | null
          current_weight?: number | null
          exercise_name: string
          id?: string
          last_session_rpe?: string | null
          last_updated?: string | null
          rep_range_max: number
          rep_range_min: number
          user_id: string
        }
        Update: {
          consecutive_easy_sessions?: number | null
          consecutive_hard_sets?: number | null
          current_reps_target?: number | null
          current_weight?: number | null
          exercise_name?: string
          id?: string
          last_session_rpe?: string | null
          last_updated?: string | null
          rep_range_max?: number
          rep_range_min?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          date: string
          exercise_name: string
          id: string
          reps: number | null
          rpe: string | null
          set_number: number
          user_id: string
          weight: number | null
        }
        Insert: {
          date?: string
          exercise_name: string
          id?: string
          reps?: number | null
          rpe?: string | null
          set_number: number
          user_id: string
          weight?: number | null
        }
        Update: {
          date?: string
          exercise_name?: string
          id?: string
          reps?: number | null
          rpe?: string | null
          set_number?: number
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
