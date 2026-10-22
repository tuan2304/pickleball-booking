import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { addDaysToDateKey, vnDateKey, vnDateTime } from '@/lib/datetime'

export const PERIOD_OPTIONS = [7, 30, 90] as const
export type PeriodDays = (typeof PERIOD_OPTIONS)[number]

export function parsePeriod(value: string | undefined): PeriodDays {
  const n = Number(value)
  return (PERIOD_OPTIONS as readonly number[]).includes(n) ? (n as PeriodDays) : 30
}

/**
 * Khoảng thống kê gồm `days` ngày theo giờ Việt Nam, kết thúc hết ngày hôm nay.
 * Trả về [from, to) với from = 0h ngày đầu, to = 0h ngày mai.
 */
export function periodRange(days: number, now: Date | number = Date.now()): { from: Date; to: Date } {
  const today = vnDateKey(now)
  const tomorrow = addDaysToDateKey(today, 1)
  const first = addDaysToDateKey(tomorrow, -days)
  return { from: vnDateTime(first, 0), to: vnDateTime(tomorrow, 0) }
}

export interface PlatformStats {
  users: { total: number; players: number; owners: number; new: number }
  clubs: { total: number; new: number; pro: number; own_payos: number }
  courts_active: number
  bookings: { created: number; confirmed: number; pending: number; cancelled: number; gmv: number }
  deposits: { collected: number; platform_channel: number; club_channel: number; needs_refund: number }
  subscriptions: { revenue: number; count: number }
  matches: { created: number; open: number }
  owed_total: number
  open_tickets: number
  daily: Array<{ day: string; bookings: number; deposits: number; new_users: number }>
  top_clubs: Array<{ id: string; name: string; bookings: number; gmv: number }>
}

export async function getPlatformStats(
  admin: SupabaseClient<Database>,
  days: number,
  now: Date | number = Date.now()
): Promise<PlatformStats> {
  const { from, to } = periodRange(days, now)
  const { data, error } = await admin.rpc('platform_stats', { p_from: from.toISOString(), p_to: to.toISOString() })
  if (error || !data) {
    console.error('platform_stats lỗi', error)
    throw new Error('Không tải được số liệu thống kê')
  }
  return data as unknown as PlatformStats
}

/** Tỷ lệ phần trăm an toàn khi mẫu số bằng 0. */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
