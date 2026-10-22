// Phần tự sinh nằm ở supabase.generated.ts. KHÔNG sửa tay file đó, cập nhật bằng:
//   npm run db:types
// File này giữ các type nghiệp vụ viết tay, dựng trên type tự sinh.
import type { Database } from './supabase.generated'

export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './supabase.generated'

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


