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
      bookings: {
        Row: {
          court_id: string
          created_at: string
          deposit_amount: number
          during: unknown
          end_time: string
          expires_at: string
          id: string
          is_open_match: boolean
          note: string | null
          start_time: string
          status: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          court_id: string
          created_at?: string
          deposit_amount: number
          during?: unknown
          end_time: string
          expires_at?: string
          id?: string
          is_open_match?: boolean
          note?: string | null
          start_time: string
          status?: string
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          court_id?: string
          created_at?: string
          deposit_amount?: number
          during?: unknown
          end_time?: string
          expires_at?: string
          id?: string
          is_open_match?: boolean
          note?: string | null
          start_time?: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          address: string
          amenities: string[] | null
          city: string | null
          close_time: string
          created_at: string
          description: string | null
          district: string | null
          id: string
          images: string[] | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          open_time: string
          owner_id: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          city?: string | null
          close_time?: string
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          open_time?: string
          owner_id: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          city?: string | null
          close_time?: string
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          open_time?: string
          owner_id?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_reviews: {
        Row: {
          club_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_reviews_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_pricing_rules: {
        Row: {
          court_id: string
          created_at: string
          days_of_week: number[]
          end_time: string
          id: string
          name: string
          price_per_hour: number
          start_time: string
        }
        Insert: {
          court_id: string
          created_at?: string
          days_of_week?: number[]
          end_time: string
          id?: string
          name: string
          price_per_hour: number
          start_time: string
        }
        Update: {
          court_id?: string
          created_at?: string
          days_of_week?: number[]
          end_time?: string
          id?: string
          name?: string
          price_per_hour?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_pricing_rules_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          base_price_per_hour: number
          club_id: string
          created_at: string
          deposit_percentage: number
          id: string
          is_active: boolean
          name: string
          sport_type: string
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          base_price_per_hour: number
          club_id: string
          created_at?: string
          deposit_percentage?: number
          id?: string
          is_active?: boolean
          name: string
          sport_type: string
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          base_price_per_hour?: number
          club_id?: string
          created_at?: string
          deposit_percentage?: number
          id?: string
          is_active?: boolean
          name?: string
          sport_type?: string
          surface_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          id: string
          joined_at: string
          match_id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          match_id: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          match_id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          booking_id: string
          cost_per_person: number | null
          cost_sharing_type: string
          created_at: string
          creator_id: string
          current_players: number
          description: string | null
          id: string
          required_players: number
          skill_level: string
          sport_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          cost_per_person?: number | null
          cost_sharing_type?: string
          created_at?: string
          creator_id: string
          current_players?: number
          description?: string | null
          id?: string
          required_players?: number
          skill_level?: string
          sport_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          cost_per_person?: number | null
          cost_sharing_type?: string
          created_at?: string
          creator_id?: string
          current_players?: number
          description?: string | null
          id?: string
          required_players?: number
          skill_level?: string
          sport_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          checkout_url: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_code: number
          paid_at: string | null
          payment_method: string
          payos_transaction_id: string | null
          qr_code_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          checkout_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_code: number
          paid_at?: string | null
          payment_method?: string
          payos_transaction_id?: string | null
          qr_code_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          checkout_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_code?: number
          paid_at?: string | null
          payment_method?: string
          payos_transaction_id?: string | null
          qr_code_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone_number: string | null
          rating: number | null
          role: string
          skill_level: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone_number?: string | null
          rating?: number | null
          role?: string
          skill_level?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          rating?: number | null
          role?: string
          skill_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_payos_order_code: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      expire_pending_bookings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_busy_slots: {
        Args: { p_court_ids: string[] }
        Returns: {
          court_id: string
          start_time: string
          end_time: string
          status: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

export type UserRole = 'player' | 'owner' | 'admin'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type MatchStatus = 'open' | 'full' | 'closed' | 'cancelled'
export type ParticipantStatus = 'pending' | 'accepted' | 'rejected' | 'left'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'failed' | 'refunded'
export type CostSharingType = 'split' | 'host_covers'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Club = Database['public']['Tables']['clubs']['Row']
export type Court = Database['public']['Tables']['courts']['Row']
export type CourtPricingRule = Database['public']['Tables']['court_pricing_rules']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchParticipant = Database['public']['Tables']['match_participants']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type NotificationType = 'booking' | 'payment' | 'match' | 'system'
export type Notification = Database['public']['Tables']['notifications']['Row']

export type MiniProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
}

export interface MatchMessage {
  id: string
  match_id: string
  user_id: string
  content: string
  created_at: string
  profile?: MiniProfile
}

export interface ClubReview {
  id: string
  club_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
  profile?: MiniProfile
}


