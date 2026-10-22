import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { courtLimit, isBillingEnforced, FREE_COURT_LIMIT } from '@/lib/billing'

/** Cụm sân còn được thêm/kích hoạt sân con không, theo gói thuê bao (chỉ áp dụng từ BILLING_ENFORCED_FROM). */
export async function checkCourtAllowance(
  supabase: SupabaseClient<Database>,
  clubId: string,
  options: { excludeCourtId?: string } = {}
): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date()
  if (!isBillingEnforced(now)) return { allowed: true }

  const { data: club } = await supabase.from('clubs').select('plan, plan_until').eq('id', clubId).maybeSingle()
  if (!club) return { allowed: false, message: 'Không tìm thấy cụm sân' }

  const limit = courtLimit({ plan: club.plan, planUntil: club.plan_until, now, enforced: true })
  if (!Number.isFinite(limit)) return { allowed: true }

  const { data: courts } = await supabase.from('courts').select('id, is_active').eq('club_id', clubId)
  const active = (courts ?? []).filter((c) => c.is_active && c.id !== options.excludeCourtId).length
  if (active >= limit) {
    return {
      allowed: false,
      message: `Gói Free chỉ cho tối đa ${FREE_COURT_LIMIT} sân con đang hoạt động. Hãy nâng cấp gói Pro ở mục "Gói dịch vụ" để thêm sân.`,
    }
  }
  return { allowed: true }
}
