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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      feed_comments: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string | null
          from_avatar_url: string | null
          from_user_id: string
          from_username: string
          id: string
          status: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          from_avatar_url?: string | null
          from_user_id: string
          from_username: string
          id?: string
          status?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          from_avatar_url?: string | null
          from_user_id?: string
          from_username?: string
          id?: string
          status?: string | null
          to_user_id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_streak: number | null
          friend_id: string
          id: string
          status: string | null
          total_xp: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          friend_id: string
          id?: string
          status?: string | null
          total_xp?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          friend_id?: string
          id?: string
          status?: string | null
          total_xp?: number | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avatar_url: string | null
          cached_at: string | null
          current_streak: number | null
          id: string
          rank: number | null
          total_xp: number | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          cached_at?: string | null
          current_streak?: number | null
          id?: string
          rank?: number | null
          total_xp?: number | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          cached_at?: string | null
          current_streak?: number | null
          id?: string
          rank?: number | null
          total_xp?: number | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          lessons_completed: number | null
          longest_streak: number | null
          myths_busted: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          lessons_completed?: number | null
          longest_streak?: number | null
          myths_busted?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          lessons_completed?: number | null
          longest_streak?: number | null
          myths_busted?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_streak: number | null
          id: string
          is_npc: boolean | null
          lessons_completed: number | null
          longest_streak: number | null
          myths_busted: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          is_npc?: boolean | null
          lessons_completed?: number | null
          longest_streak?: number | null
          myths_busted?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          is_npc?: boolean | null
          lessons_completed?: number | null
          longest_streak?: number | null
          myths_busted?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string
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
