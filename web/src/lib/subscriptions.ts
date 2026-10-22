import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notify'
import { formatDate } from '@/lib/format'
import type { SettleResult } from '@/lib/payments'

interface SettleSubscriptionInput {
  orderCode: number
  /** Số tiền thực nhận từ PayOS; bỏ trống chỉ dùng cho giả lập ở dev */
  paidAmount?: number
  reference: string
}

/**
 * Ghi nhận một khoản thuê bao đã thanh toán và gia hạn gói cho cụm sân.
 * Việc đổi trạng thái + cộng hạn nằm trong một hàm SQL nguyên tử nên webhook gọi lặp không cộng hạn hai lần.
 */
export async function settleSubscription({ orderCode, paidAmount, reference }: SettleSubscriptionInput): Promise<SettleResult> {
  const admin = createAdminClient()

  const { data: payment, error: findErr } = await admin
    .from('subscription_payments')
    .select('id, club_id, user_id, amount, status')
    .eq('order_code', orderCode)
    .maybeSingle()

  if (findErr) {
    console.error('settleSubscription: lỗi tra cứu', findErr)
    return { ok: false, status: 500, error: 'Không tra cứu được giao dịch thuê bao' }
  }
  if (!payment) {
    return { ok: false, status: 404, error: `Không tìm thấy giao dịch thuê bao ${orderCode}` }
  }
  if (payment.status === 'paid') {
    return { ok: true, alreadyPaid: true }
  }
  if (paidAmount !== undefined && paidAmount < Number(payment.amount)) {
    console.warn(`settleSubscription: đơn ${orderCode} chuyển thiếu (${paidAmount} < ${payment.amount})`)
    return { ok: false, status: 400, error: 'Số tiền thanh toán không khớp với đơn' }
  }

  const { data: applied, error: applyErr } = await admin.rpc('apply_subscription_payment', {
    p_payment_id: payment.id,
    p_reference: reference || undefined,
  })
  if (applyErr) {
    console.error('settleSubscription: lỗi áp thuê bao', applyErr)
    return { ok: false, status: 500, error: 'Không gia hạn được gói' }
  }
  if (!applied || applied.length === 0) {
    return { ok: true, alreadyPaid: true }
  }

  await notifyUser({
    userId: payment.user_id,
    title: 'Gia hạn gói Pro thành công! 🎉',
    message: `Cụm sân của bạn dùng gói Pro đến ${formatDate(applied[0].plan_until)}.`,
    type: 'system',
    link: '/owner/billing',
  })

  revalidatePath('/owner/billing')
  revalidatePath('/owner/dashboard')
  revalidatePath('/clubs')
  return { ok: true }
}
