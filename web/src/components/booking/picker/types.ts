import type { MatchSkillId } from '@/lib/constants'

export interface CourtData {
  id: string
  name: string
  sport_type: string
  surface_type: string | null
  base_price_per_hour: number
  deposit_percentage: number
  is_active: boolean
  court_pricing_rules: Array<{
    id: string
    name: string
    start_time: string
    end_time: string
    price_per_hour: number
    days_of_week: number[]
  }>
}

/** Cấu hình mở ghép kèo ngay khi đặt sân */
export interface MatchDraft {
  enabled: boolean
  title: string
  requiredPlayers: number
  skillLevel: MatchSkillId
  costSharingType: 'split' | 'host_covers'
}

export const INITIAL_MATCH_DRAFT: MatchDraft = {
  enabled: false,
  title: '',
  requiredPlayers: 4,
  skillLevel: 'all',
  costSharingType: 'split',
}
