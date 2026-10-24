import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

const BLOCKED_MESSAGE =
  'Không thể xóa vì đã có đơn đặt hoặc giao dịch liên quan (xóa sẽ làm mất lịch sử thanh toán). Hãy tạm ngưng hoạt động thay vì xóa.'

/**
 * Xóa sân con/cụm sân kéo theo xóa dây chuyền đơn đặt, thanh toán và lịch sử thuê bao (ON DELETE CASCADE),
 * tức là làm mất sổ sách tiền cọc. Chỉ cho xóa khi chưa có dữ liệu thật nào dính tới. Trả về thông báo lý do nếu bị chặn.
 *
 * Dùng client có quyền đọc đủ (service_role) vì đây là phép kiểm tra, không phải thao tác của người dùng.
 */
async function hasFinancialTrail(admin: Client, courtIds: string[], clubId?: string): Promise<boolean> {
  if (courtIds.length > 0) {
    const { data: bookings } = await admin.from('bookings').select('id, status').in('court_id', courtIds)
    const list = bookings ?? []
    // Còn đơn đang giữ chỗ / đã xác nhận / đã hoàn thành
    if (list.some((b) => b.status !== 'cancelled')) return true

    // Đơn đã hủy nhưng khách đã chuyển tiền (cần hoàn hoặc đối soát)
    if (list.length > 0) {
      const { data: paid } = await admin
        .from('payments')
        .select('id')
        .in('booking_id', list.map((b) => b.id))
        .eq('status', 'paid')
      if ((paid ?? []).length > 0) return true
    }
  }

  if (clubId) {
    const { data: subs } = await admin.from('subscription_payments').select('id').eq('club_id', clubId).eq('status', 'paid')
    if ((subs ?? []).length > 0) return true
  }
  return false
}

export async function getCourtDeletionBlocker(admin: Client, courtId: string): Promise<string | null> {
  return (await hasFinancialTrail(admin, [courtId])) ? BLOCKED_MESSAGE : null
}

export async function getClubDeletionBlocker(admin: Client, clubId: string): Promise<string | null> {
  const { data: courts } = await admin.from('courts').select('id').eq('club_id', clubId)
  const courtIds = (courts ?? []).map((c) => c.id)
  return (await hasFinancialTrail(admin, courtIds, clubId)) ? BLOCKED_MESSAGE : null
}
