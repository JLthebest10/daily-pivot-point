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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_id: string
          balance: number
          connection_id: string
          created_at: string
          id: string
          name: string
          number: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          balance?: number
          connection_id: string
          created_at?: string
          id?: string
          name?: string
          number?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          balance?: number
          connection_id?: string
          created_at?: string
          id?: string
          name?: string
          number?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          created_at: string
          id: string
          institution_name: string
          item_id: string
          last_synced_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_name?: string
          item_id: string
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_name?: string
          item_id?: string
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          path: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          path?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string
          color: string
          created_at: string
          date: string
          description: string | null
          duration_min: number
          id: string
          importance: string
          location: string | null
          reminder_min: number | null
          repeat: string
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          date: string
          description?: string | null
          duration_min?: number
          id?: string
          importance?: string
          location?: string | null
          reminder_min?: number | null
          repeat?: string
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          date?: string
          description?: string | null
          duration_min?: number
          id?: string
          importance?: string
          location?: string | null
          reminder_min?: number | null
          repeat?: string
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          created_at: string
          date: string
          exercise_id: string
          id: string
          note: string | null
          reps: number
          rir: number | null
          session_id: string
          set_number: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          exercise_id: string
          id?: string
          note?: string | null
          reps?: number
          rir?: number | null
          session_id: string
          set_number?: number
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          date?: string
          exercise_id?: string
          id?: string
          note?: string | null
          reps?: number
          rir?: number | null
          session_id?: string
          set_number?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          rest_sec: number
          target_reps: number
          target_sets: number
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          rest_sec?: number
          target_reps?: number
          target_sets?: number
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          rest_sec?: number
          target_reps?: number
          target_sets?: number
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          created_at: string
          current_value: number
          deadline: string | null
          id: string
          name: string
          start_value: number
          target_value: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_value?: number
          deadline?: string | null
          id?: string
          name: string
          start_value?: number
          target_value?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number
          deadline?: string | null
          id?: string
          name?: string
          start_value?: number
          target_value?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          habit_id: string
          id?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          anchor_date: string | null
          archived: boolean
          category: string
          color: string
          created_at: string
          days: number[]
          icon: string
          id: string
          interval_days: number
          name: string
          note: string | null
          schedule_type: string
          target: number
          time: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_date?: string | null
          archived?: boolean
          category?: string
          color?: string
          created_at?: string
          days?: number[]
          icon?: string
          id?: string
          interval_days?: number
          name: string
          note?: string | null
          schedule_type?: string
          target?: number
          time?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_date?: string | null
          archived?: boolean
          category?: string
          color?: string
          created_at?: string
          days?: number[]
          icon?: string
          id?: string
          interval_days?: number
          name?: string
          note?: string | null
          schedule_type?: string
          target?: number
          time?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          meal_id: string
          option_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          meal_id: string
          option_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          meal_id?: string
          option_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "meal_options"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_options: {
        Row: {
          created_at: string
          id: string
          kcal: number | null
          meal_id: string
          name: string
          note: string | null
          order_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kcal?: number | null
          meal_id: string
          name: string
          note?: string | null
          order_index?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kcal?: number | null
          meal_id?: string
          name?: string
          note?: string | null
          order_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_options_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          archived: boolean
          created_at: string
          days: number[]
          id: string
          kcal: number | null
          name: string
          note: string | null
          time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          days?: number[]
          id?: string
          kcal?: number | null
          name: string
          note?: string | null
          time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          days?: number[]
          id?: string
          kcal?: number | null
          name?: string
          note?: string | null
          time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_records: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          pet_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          pet_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          pet_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_weights: {
        Row: {
          created_at: string
          date: string
          id: string
          pet_id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          pet_id: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          pet_id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_weights_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birth_date: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          modules: string[]
          monthly_savings_goal: number
          name: string
          onboarded: boolean
          theme: string
          updated_at: string
          weekly_workout_goal: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          modules?: string[]
          monthly_savings_goal?: number
          name?: string
          onboarded?: boolean
          theme?: string
          updated_at?: string
          weekly_workout_goal?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          modules?: string[]
          monthly_savings_goal?: number
          name?: string
          onboarded?: boolean
          theme?: string
          updated_at?: string
          weekly_workout_goal?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          note: string | null
          product: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          product: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          product?: string
          user_id?: string
        }
        Relationships: []
      }
      savings: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          bought: boolean
          created_at: string
          id: string
          name: string
          note: string | null
          order_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bought?: boolean
          created_at?: string
          id?: string
          name: string
          note?: string | null
          order_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bought?: boolean
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          order_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_debts: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          item: string
          note: string | null
          paid: boolean
          paid_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          item: string
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          item?: string
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          done: boolean
          due_date: string | null
          due_time: string | null
          id: string
          note: string | null
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          due_time?: string | null
          id?: string
          note?: string | null
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          due_time?: string | null
          id?: string
          note?: string | null
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string
          category_locked: boolean
          created_at: string
          date: string
          description: string | null
          external_id: string | null
          id: string
          payment_method: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category?: string
          category_locked?: boolean
          created_at?: string
          date?: string
          description?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          source?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          category_locked?: boolean
          created_at?: string
          date?: string
          description?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          note: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          note?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          note?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          focus: string | null
          id: string
          name: string
          note: string | null
          updated_at: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          focus?: string | null
          id?: string
          name: string
          note?: string | null
          updated_at?: string
          user_id: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          focus?: string | null
          id?: string
          name?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          weekdays?: number[]
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
  public: {
    Enums: {},
  },
} as const
