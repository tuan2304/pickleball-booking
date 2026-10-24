// Phần tự sinh nằm ở supabase.generated.ts. KHÔNG sửa tay file đó, cập nhật bằng:
//   npm run db:types
// File này giữ các type nghiệp vụ viết tay, dựng trên type tự sinh.
export type { Database } from './supabase.generated'

export type UserRole = 'player' | 'owner' | 'admin'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type NotificationType = 'booking' | 'payment' | 'match' | 'system'

export type MiniProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  // Khách (anon) không đọc được cột role nên các truy vấn công khai bỏ qua nó
  role?: string
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


