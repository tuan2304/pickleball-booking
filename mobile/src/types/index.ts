export type UserRole = 'player' | 'owner' | 'admin'
export type SportType = 'pickleball' | 'badminton' | 'football' | 'tennis' | 'basketball'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all'

export interface Profile {
  id: string
  full_name: string
  // Không đọc trực tiếp được từ bảng profiles (quyền cột); chỉ có khi lấy qua hàm phía server
  phone_number?: string | null
  avatar_url: string | null
  role: UserRole
  skill_level: string | null
  rating: number | null
}

export interface Club {
  id: string
  owner_id: string
  name: string
  description: string | null
  address: string
  ward: string | null
  district: string | null
  city: string | null
  latitude?: number | null
  longitude?: number | null
  open_time: string
  close_time: string
  amenities: string[] | null
  images: string[] | null
  is_active: boolean
  courts?: Court[]
}

export interface Court {
  id: string
  club_id: string
  name: string
  sport_type: SportType
  surface_type: string | null
  base_price_per_hour: number
  deposit_percentage: number
  is_active: boolean
  club?: Club
}

export interface Match {
  id: string
  booking_id: string
  creator_id: string
  title: string
  description: string | null
  sport_type: SportType
  skill_level: SkillLevel
  required_players: number
  current_players: number
  cost_sharing_type: 'split' | 'host_covers'
  cost_per_person: number | null
  status: 'open' | 'full' | 'closed' | 'cancelled'
  created_at: string
  creator?: Profile
  booking?: {
    start_time: string
    end_time: string
    court?: {
      name: string
      club?: {
        name: string
        address: string
        district?: string | null
        city?: string | null
      }
    }
  }
  participants?: MatchParticipant[]
}

export interface MatchParticipant {
  id: string
  match_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'left'
  message: string | null
  joined_at: string
  profile?: Profile
}

export interface Booking {
  id: string
  court_id: string
  user_id: string
  start_time: string
  end_time: string
  total_price: number
  deposit_amount: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  is_open_match: boolean
  note: string | null
  court?: Court
}

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  type: 'booking' | 'payment' | 'match' | 'system'
  link: string | null
  is_read: boolean
  created_at: string
}
