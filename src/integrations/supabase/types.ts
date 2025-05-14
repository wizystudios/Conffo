export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          confession_id: string
          content: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          confession_id: string
          content: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          confession_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confessions: {
        Row: {
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          room_id: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          room_id: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          room_id?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "confessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          related_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_admin: boolean
          is_moderator: boolean
          is_public: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id: string
          is_admin?: boolean
          is_moderator?: boolean
          is_public?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          is_moderator?: boolean
          is_public?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          confession_id: string | null
          created_at: string
          id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          confession_id?: string | null
          created_at?: string
          id?: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          confession_id?: string | null
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          item_id: string
          item_type: string
          reason: Database["public"]["Enums"]["report_reason"]
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          item_id: string
          item_type: string
          reason: Database["public"]["Enums"]["report_reason"]
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          item_id?: string
          item_type?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      room_follows: {
        Row: {
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_follows_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          description: string
          id: string
          is_pinned: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id: string
          is_pinned?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_pinned?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_confessions: {
        Row: {
          confession_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_confessions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          effects: Json | null
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          viewed_by: string[] | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          effects?: Json | null
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
          viewed_by?: string[] | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          effects?: Json | null
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          viewed_by?: string[] | null
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_follow: {
        Args: { p_follower_id: string; p_following_id: string }
        Returns: undefined
      }
      check_if_following: {
        Args: { follower_uuid: string; following_uuid: string }
        Returns: boolean
      }
      follow_user: {
        Args: { follower_uuid: string; following_uuid: string }
        Returns: undefined
      }
      get_active_stories: {
        Args: { user_uuid: string }
        Returns: {
          id: string
          user_id: string
          media_url: string
          media_type: string
          caption: string
          effects: Json
          created_at: string
          expires_at: string
          is_viewed: boolean
        }[]
      }
      get_comment_count: {
        Args: { confession_uuid: string }
        Returns: number
      }
      get_followers_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_following_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_reaction_counts: {
        Args: { confession_uuid: string }
        Returns: Json
      }
      get_reaction_counts_for_all_confessions: {
        Args: Record<PropertyKey, never>
        Returns: {
          confession_id: string
          total_reactions: number
        }[]
      }
      get_user_reactions: {
        Args: { confession_uuid: string; user_uuid: string }
        Returns: string[]
      }
      mark_story_viewed: {
        Args: { story_uuid: string; viewer_uuid: string }
        Returns: undefined
      }
      remove_follow: {
        Args: { p_follower_id: string; p_following_id: string }
        Returns: undefined
      }
      unfollow_user: {
        Args: { follower_uuid: string; following_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      reaction_type: "like" | "laugh" | "shock" | "heart"
      report_reason:
        | "offensive"
        | "spam"
        | "harassment"
        | "inappropriate"
        | "other"
      room_type:
        | "relationships"
        | "school"
        | "work"
        | "family"
        | "friends"
        | "random"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      reaction_type: ["like", "laugh", "shock", "heart"],
      report_reason: [
        "offensive",
        "spam",
        "harassment",
        "inappropriate",
        "other",
      ],
      room_type: [
        "relationships",
        "school",
        "work",
        "family",
        "friends",
        "random",
      ],
    },
  },
} as const
