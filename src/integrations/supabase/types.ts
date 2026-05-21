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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          coins: number
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          coins?: number
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          coins?: number
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      spin_wheels: {
        Row: {
          admin_pct: number
          admin_pool: number
          app_pct: number
          app_pool: number
          created_at: string
          created_by: string
          elim_interval_seconds: number
          ended_at: string | null
          entry_fee: number
          id: string
          join_window_seconds: number
          min_participants: number
          scheduled_start_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["wheel_status"]
          winner_pct: number
          winner_pool: number
          winner_user_id: string | null
        }
        Insert: {
          admin_pct: number
          admin_pool?: number
          app_pct: number
          app_pool?: number
          created_at?: string
          created_by: string
          elim_interval_seconds: number
          ended_at?: string | null
          entry_fee: number
          id?: string
          join_window_seconds: number
          min_participants: number
          scheduled_start_at: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["wheel_status"]
          winner_pct: number
          winner_pool?: number
          winner_user_id?: string | null
        }
        Update: {
          admin_pct?: number
          admin_pool?: number
          app_pct?: number
          app_pool?: number
          created_at?: string
          created_by?: string
          elim_interval_seconds?: number
          ended_at?: string | null
          entry_fee?: number
          id?: string
          join_window_seconds?: number
          min_participants?: number
          scheduled_start_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["wheel_status"]
          winner_pct?: number
          winner_pool?: number
          winner_user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          meta: Json
          user_id: string | null
          wheel_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tx_kind"]
          meta?: Json
          user_id?: string | null
          wheel_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          meta?: Json
          user_id?: string | null
          wheel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wheel_config: {
        Row: {
          admin_pct: number
          app_pct: number
          elim_interval_seconds: number
          entry_fee: number
          id: number
          join_window_seconds: number
          min_participants: number
          updated_at: string
          winner_pct: number
        }
        Insert: {
          admin_pct?: number
          app_pct?: number
          elim_interval_seconds?: number
          entry_fee?: number
          id?: number
          join_window_seconds?: number
          min_participants?: number
          updated_at?: string
          winner_pct?: number
        }
        Update: {
          admin_pct?: number
          app_pct?: number
          elim_interval_seconds?: number
          entry_fee?: number
          id?: number
          join_window_seconds?: number
          min_participants?: number
          updated_at?: string
          winner_pct?: number
        }
        Relationships: []
      }
      wheel_participants: {
        Row: {
          eliminated_at: string | null
          elimination_order: number | null
          id: string
          is_winner: boolean
          joined_at: string
          user_id: string
          wheel_id: string
        }
        Insert: {
          eliminated_at?: string | null
          elimination_order?: number | null
          id?: string
          is_winner?: boolean
          joined_at?: string
          user_id: string
          wheel_id: string
        }
        Update: {
          eliminated_at?: string | null
          elimination_order?: number | null
          id?: string
          is_winner?: boolean
          joined_at?: string
          user_id?: string
          wheel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_participants_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _abort_wheel: {
        Args: { _reason: string; _wheel_id: string }
        Returns: undefined
      }
      _begin_wheel: { Args: { _wheel_id: string }; Returns: undefined }
      _finalize_wheel: { Args: { _wheel_id: string }; Returns: undefined }
      _move_coins: {
        Args: {
          _delta: number
          _kind: Database["public"]["Enums"]["tx_kind"]
          _meta: Json
          _user_id: string
          _wheel_id: string
        }
        Returns: number
      }
      claim_admin_if_first: { Args: never; Returns: boolean }
      create_wheel: { Args: never; Returns: string }
      grant_coins: {
        Args: { _amount: number; _target: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_wheel: { Args: { _wheel_id: string }; Returns: undefined }
      promote_to_admin: { Args: { _target: string }; Returns: undefined }
      start_wheel: { Args: { _wheel_id: string }; Returns: undefined }
      tick_wheels: { Args: never; Returns: undefined }
      update_config: {
        Args: {
          _admin_pct: number
          _app_pct: number
          _elim_interval_seconds: number
          _entry_fee: number
          _join_window_seconds: number
          _min_participants: number
          _winner_pct: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      tx_kind:
        | "starting_grant"
        | "join_debit"
        | "winner_credit"
        | "admin_credit"
        | "app_credit"
        | "refund"
        | "admin_grant"
      wheel_status: "waiting" | "running" | "completed" | "aborted"
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
    Enums: {
      app_role: ["admin", "user"],
      tx_kind: [
        "starting_grant",
        "join_debit",
        "winner_credit",
        "admin_credit",
        "app_credit",
        "refund",
        "admin_grant",
      ],
      wheel_status: ["waiting", "running", "completed", "aborted"],
    },
  },
} as const
