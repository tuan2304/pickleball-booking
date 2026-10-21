import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notify'

export type SettleResult =
  | { ok: true; alreadyPaid?: boolean; needsRefund?: boolean }
  | { ok: false; status: 400 | 404 | 500; error: string }

interface SettleInput {
  orderCode: number
  /** Số tiền thực nhận từ PayOS; bỏ trống nếu không có (chỉ dùng cho giả lập dev) */
  paidAmount?: number
  reference: string
}

const money = (n: number) => Number(n).toLocaleString('vi-VN')

/**
 * Ghi nhận một khoản cọc đã được thanh toán. Dùng chung cho webhook PayOS và giả lập khi dev.
 * An toàn khi bị gọi lặp (PayOS có thể gửi lại webhook): chỉ lần đầu tiên chuyển pending → paid.
 */
export async function settlePayment({ orderCode, paidAmount, reference }: SettleInput): Promise<SettleResult> {
  const admin = createAdminClient()

  const { data: payment, error: findErr } = await admin
    .from('payments')
    .select(`
      id, booking_id, user_id, amount, status,
      booking:bookings (
        id, status,
        court:courts ( name, club:clubs ( name, owner_id ) )
      )
    `)
    .eq('order_code', orderCode)
    .maybeSingle()

  if (findErr) {
    console.error('settlePayment: lỗi tra cứu payment', findErr)
    return { ok: false, status: 500, error: 'Không tra cứu được giao dịch' }
  }
  if (!payment) {
    return { ok: false, status: 404, error: `Không tìm thấy đơn thanh toán ${orderCode}` }
  }
  if (payment.status === 'paid') {
    return { ok: true, alreadyPaid: true }
  }

  // Chặn trường hợp chuyển thiếu tiền
  if (paidAmount !== undefined && paidAmount < Number(payment.amount)) {
    console.warn(`settlePayment: đơn ${orderCode} chuyển thiếu (${paidAmount} < ${payment.amount})`)
    return { ok: false, status: 400, error: 'Số tiền thanh toán không khớp với đơn' }
  }

  // Giành quyền xử lý: chỉ một request chuyển được pending → paid
  const { data: claimed, error: claimErr } = await admin
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payos_transaction_id: reference || `SIM_${Date.now()}`,
    })
    .eq('id', payment.id)
    .in('status', ['pending', 'cancelled'])
    .select('id')

  if (claimErr) {
    console.error('settlePayment: lỗi cập nhật payment', claimErr)
    return { ok: false, status: 500, error: 'Không cập nhật được giao dịch' }
  }
  if (!claimed || claimed.length === 0) {
    return { ok: true, alreadyPaid: true }
  }

  // Xác nhận đơn. Nếu đơn đã bị hủy do hết hạn mà tiền vẫn về, thử giành lại khung giờ.
  const booking = payment.booking as unknown as {
    id: string
    status: string
    court: { name: string; club: { name: string; owner_id: string } | null } | null
  } | null

  const { error: bookingErr } = await admin
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', payment.booking_id)
    .in('status', ['pending', 'cancelled'])

  let needsRefund = false
  if (bookingErr) {
    if (bookingErr.code === '23P01') {
      // Khung giờ đã có người khác đặt → giữ lại bằng chứng để hoàn tiền thủ công
      needsRefund = true
      await admin
        .from('payments')
        .update({ metadata: { needs_refund: true, reason: 'slot_taken_after_expiry' } })
        .eq('id', payment.id)
    } else {
      console.error('settlePayment: lỗi xác nhận booking', bookingErr)
      // Trả 500 để PayOS gọi lại; trả payment về pending để lần sau xử lý lại từ đầu
      await admin.from('payments').update({ status: 'pending', paid_at: null }).eq('id', payment.id)
      return { ok: false, status: 500, error: 'Không xác nhận được lịch đặt' }
    }
  } else {
    // Kèo gắn với đơn (nếu bị hủy do hết hạn) được mở lại
    await admin
      .from('matches')
      .update({ status: 'open' })
      .eq('booking_id', payment.booking_id)
      .eq('status', 'cancelled')
  }

  const courtName = booking?.court?.name || 'Sân'
  const clubName = booking?.court?.club?.name || 'Cụm sân'
  const ownerId = booking?.court?.club?.owner_id

  if (needsRefund) {
    await notifyUser({
      userId: payment.user_id,
      title: 'Đã nhận cọc nhưng khung giờ không còn',
      message: `Chúng tôi đã nhận ${money(payment.amount)} đ nhưng khung giờ ${courtName} (${clubName}) đã có người khác đặt trong lúc đơn hết hạn. Vui lòng liên hệ để được hoàn tiền.`,
      type: 'payment',
      link: `/bookings/${payment.booking_id}`,
    })
  } else {
    await notifyUser({
      userId: payment.user_id,
      title: 'Thanh toán cọc thành công! 🎉',
      message: `Bạn đã cọc ${money(payment.amount)} đ cho sân ${courtName} (${clubName}). Sân đã được khóa lịch cho bạn!`,
      type: 'payment',
      link: `/bookings/${payment.booking_id}`,
    })
    if (ownerId) {
      await notifyUser({
        userId: ownerId,
        title: 'Có đơn đặt sân mới! 💰',
        message: `Khách vừa chuyển cọc ${money(payment.amount)} đ cho ${courtName} (${clubName}).`,
        type: 'booking',
        link: '/owner/schedule',
      })
    }
  }

  revalidatePath(`/bookings/${payment.booking_id}`)
  revalidatePath('/my-bookings')
  revalidatePath('/owner/schedule')
  revalidatePath('/owner/dashboard')

  return { ok: true, needsRefund }
}
