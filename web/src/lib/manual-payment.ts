import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notify'
import { formatVnd } from '@/lib/format'
import { revalidateBookingPages } from '@/lib/booking-service'

/**
 * Thanh toán bằng chuyển khoản thủ công: không có webhook nên có hai bước của con người.
 * 1. Khách chuyển khoản rồi bấm "Tôi đã chuyển khoản" (claim): đơn được giữ chỗ lâu hơn và chủ sân nhận thông báo.
 * 2. Chủ sân đối chiếu sao kê rồi xác nhận đơn (đi qua settlePayment như một khoản cọc thật).
 */

/** Sau khi khách báo đã chuyển khoản, giữ chỗ thêm tối đa chừng này để chủ sân kịp đối chiếu. */
export const CLAIM_HOLD_HOURS = 3

export interface LatestPayment {
  id: string
  order_code: number
  status: string
  amount: number
  metadata: Record<string, unknown>
}

export function isManualPayment(payment: Pick<LatestPayment, 'metadata'> | null | undefined): boolean {
  return payment?.metadata?.channel === 'manual'
}

export async function latestPayment(bookingId: string): Promise<LatestPayment | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('payments')
    .select('id, order_code, status, amount, metadata')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    order_code: Number(data.order_code),
    status: data.status,
    amount: Number(data.amount),
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
  }
}

/** Mốc giữ chỗ mới sau khi khách báo đã chuyển: kéo dài nhưng không vượt quá giờ bắt đầu chơi. */
export function claimExpiry(now: Date, start: Date, currentExpiry: Date): Date {
  const extended = new Date(now.getTime() + CLAIM_HOLD_HOURS * 3_600_000)
  const capped = extended < start ? extended : start
  return capped > currentExpiry ? capped : currentExpiry
}

export async function claimTransferForUser(
  userId: string,
  bookingId: string,
  now = new Date()
): Promise<{ error?: string; success?: boolean; alreadyClaimed?: boolean }> {
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('id, user_id, status, start_time, expires_at, court:courts ( name, club:clubs ( name, owner_id ) )')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || booking.user_id !== userId) return { error: 'Không tìm thấy đơn đặt sân' }
  if (booking.status !== 'pending') return { error: 'Đơn này không còn ở trạng thái chờ cọc' }
  if (new Date(booking.expires_at) <= now) return { error: 'Đơn đã hết hạn giữ chỗ. Vui lòng đặt lại.' }

  const payment = await latestPayment(bookingId)
  if (!payment || !isManualPayment(payment) || payment.status !== 'pending') {
    return { error: 'Đơn này không thanh toán bằng chuyển khoản thủ công' }
  }
  if (typeof payment.metadata.claimed_at === 'string') return { success: true, alreadyClaimed: true }

  const { error: payErr } = await admin
    .from('payments')
    .update({ metadata: { ...payment.metadata, claimed_at: now.toISOString() } })
    .eq('id', payment.id)
  if (payErr) {
    console.error('claimTransfer: không ghi được trạng thái đã chuyển khoản', payErr)
    return { error: 'Không thể ghi nhận. Vui lòng thử lại.' }
  }

  const expiry = claimExpiry(now, new Date(booking.start_time), new Date(booking.expires_at))
  await admin.from('bookings').update({ expires_at: expiry.toISOString() }).eq('id', bookingId).eq('status', 'pending')

  const court = booking.court as unknown as { name: string; club: { name: string; owner_id: string } | null } | null
  if (court?.club) {
    await notifyUser({
      userId: court.club.owner_id,
      title: 'Khách báo đã chuyển khoản cọc',
      message: `Đơn ${court.name} (${court.club.name}): khách báo đã chuyển ${formatVnd(payment.amount)}, nội dung "SPORT ${payment.order_code}". Hãy đối chiếu sao kê rồi xác nhận đơn.`,
      type: 'payment',
      link: '/owner/schedule',
    })
  }

  revalidateBookingPages()
  return { success: true }
}
