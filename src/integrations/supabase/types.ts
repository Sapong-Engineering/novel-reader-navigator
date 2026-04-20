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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          chapter_local_id: string
          chapter_title: string
          created_at: string
          id: string
          label: string | null
          novel_id: string
          scroll_position: number
          user_id: string
        }
        Insert: {
          chapter_local_id: string
          chapter_title: string
          created_at?: string
          id?: string
          label?: string | null
          novel_id: string
          scroll_position?: number
          user_id: string
        }
        Update: {
          chapter_local_id?: string
          chapter_title?: string
          created_at?: string
          id?: string
          label?: string | null
          novel_id?: string
          scroll_position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_updates: {
        Row: {
          chapter_count: number
          discovered_at: string
          id: string
          novel_id: string
          novel_title: string
          seen: boolean
          user_id: string
        }
        Insert: {
          chapter_count?: number
          discovered_at?: string
          id?: string
          novel_id: string
          novel_title?: string
          seen?: boolean
          user_id: string
        }
        Update: {
          chapter_count?: number
          discovered_at?: string
          id?: string
          novel_id?: string
          novel_title?: string
          seen?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_updates_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          content: string | null
          created_at: string
          id: string
          local_id: string
          novel_id: string
          saved_at: string | null
          sort_order: number
          title: string
          url: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          local_id: string
          novel_id: string
          saved_at?: string | null
          sort_order?: number
          title: string
          url: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          local_id?: string
          novel_id?: string
          saved_at?: string | null
          sort_order?: number
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novels: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          local_id: string
          page_count: number | null
          reader_mode: string
          saved_at: string
          source_file_name: string | null
          source_file_size: number | null
          source_type: string
          storage_bucket: string | null
          storage_path: string | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          local_id: string
          page_count?: number | null
          reader_mode?: string
          saved_at?: string
          source_file_name?: string | null
          source_file_size?: number | null
          source_type?: string
          storage_bucket?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          local_id?: string
          page_count?: number | null
          reader_mode?: string
          saved_at?: string
          source_file_name?: string | null
          source_file_size?: number | null
          source_type?: string
          storage_bucket?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      novel_deletions: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string | null
          id: string
          local_id: string
          source: string
          title: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          local_id: string
          source?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          local_id?: string
          source?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          disabled: boolean
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_list_items: {
        Row: {
          added_at: string
          id: string
          list_id: string
          novel_local_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          novel_local_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          novel_local_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_lists: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          chapter_local_id: string
          id: string
          is_last_read: boolean
          novel_id: string
          scroll_position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_local_id: string
          id?: string
          is_last_read?: boolean
          novel_id: string
          scroll_position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_local_id?: string
          id?: string
          is_last_read?: boolean
          novel_id?: string
          scroll_position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_stats: {
        Row: {
          chapters_read: number
          date: string
          id: string
          reading_seconds: number
          user_id: string
          words_read: number
        }
        Insert: {
          chapters_read?: number
          date?: string
          id?: string
          reading_seconds?: number
          user_id: string
          words_read?: number
        }
        Update: {
          chapters_read?: number
          date?: string
          id?: string
          reading_seconds?: number
          user_id?: string
          words_read?: number
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
