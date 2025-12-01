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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      audio_posts: {
        Row: {
          audio_url: string
          confession_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          waveform_data: Json | null
        }
        Insert: {
          audio_url: string
          confession_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          waveform_data?: Json | null
        }
        Update: {
          audio_url?: string
          confession_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          waveform_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_posts_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_replies: {
        Row: {
          created_at: string
          id: string
          parent_comment_id: string
          reply_comment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_comment_id: string
          reply_comment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_comment_id?: string
          reply_comment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_replies_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_replies_reply_comment_id_fkey"
            columns: ["reply_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          confession_id: string
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          user_id: string | null
        }
        Insert: {
          confession_id: string
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          user_id?: string | null
        }
        Update: {
          confession_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
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
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_activity: string
          last_message_id: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity?: string
          last_message_id?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity?: string
          last_message_id?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: []
      }
      image_verification: {
        Row: {
          created_at: string
          id: string
          image_url: string
          status: string
          user_id: string
          verification_data: Json | null
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          status?: string
          user_id: string
          verification_data?: Json | null
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          status?: string
          user_id?: string
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          media_duration: number | null
          media_url: string | null
          message_type: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_duration?: number | null
          media_url?: string | null
          message_type?: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_duration?: number | null
          media_url?: string | null
          message_type?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
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
          birthdate: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          interests: string[] | null
          is_admin: boolean
          is_moderator: boolean
          is_public: boolean | null
          is_verified: boolean | null
          location: string | null
          privacy_settings: Json | null
          updated_at: string
          username: string | null
          verification_date: string | null
          verification_type: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          is_admin?: boolean
          is_moderator?: boolean
          is_public?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          privacy_settings?: Json | null
          updated_at?: string
          username?: string | null
          verification_date?: string | null
          verification_type?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_admin?: boolean
          is_moderator?: boolean
          is_public?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          privacy_settings?: Json | null
          updated_at?: string
          username?: string | null
          verification_date?: string | null
          verification_type?: string | null
          website?: string | null
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
      can_access_profile: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      can_view_user_info: {
        Args: { info_type: string; target_user_id: string; viewer_id: string }
        Returns: boolean
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
          caption: string
          created_at: string
          effects: Json
          expires_at: string
          id: string
          is_viewed: boolean
          media_type: string
          media_url: string
          user_id: string
        }[]
      }
      get_comment_count: { Args: { confession_uuid: string }; Returns: number }
      get_comment_like_count: {
        Args: { comment_uuid: string }
        Returns: number
      }
      get_current_user_role: { Args: never; Returns: string }
      get_followers_count: { Args: { user_uuid: string }; Returns: number }
      get_following_count: { Args: { user_uuid: string }; Returns: number }
      get_reaction_counts: { Args: { confession_uuid: string }; Returns: Json }
      get_reaction_counts_for_all_confessions: {
        Args: never
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
      user_liked_comment: {
        Args: { comment_uuid: string; user_uuid: string }
        Returns: boolean
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
