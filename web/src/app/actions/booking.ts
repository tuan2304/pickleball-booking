'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPaymentLink, isPaymentSimulationEnabled, PaymentGatewayError } from '@/lib/payos'
import { settlePayment } from '@/lib/payments'
import { computePrice } from '@/lib/pricing'
import { getVnParts } from '@/lib/datetime'
import { resolveAppUrl } from '@/lib/app-url'
import { resolveClubChannel } from '@/lib/payment-channel'
import { bookableCourtIds, courtLimit, isBillingEnforced } from '@/lib/billing'

import { isMatchSkill } from '@/lib/constants'
export interface MatchConfig {
  isOpenMatch: boolean
  title?: string
  description?: string
  skillLevel?: 'all' | 'beginner' | 'intermediate' | 'advanced'
  requiredPlayers?: number
  costSharingType?: 'split' | 'host_covers'
  costPerPerson?: number
}

export interface CreateBookingResult {
  error?: string
  bookingId?: string
}

const HOLD_MINUTES = 15
const MAX_PENDING_PER_USER = 3
const MAX_BOOKING_HOURS = 6
const MAX_DAYS_AHEAD = 60

function minutesFromTime(t: string | null | undefined, fallback: number) {
  if (!t) return fallback
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function revalidateBookingPages() {
  revalidatePath('/clubs')
  revalidatePath('/matches')
  revalidatePath('/my-bookings')
  revalidatePath('/owner/schedule')
}

export async function createBooking(
  courtId: string,
  startTimeISO: string,
  endTimeISO: string,
  note?: string,
  matchConfig?: MatchConfig
): Promise<CreateBookingResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập để tiến hành đặt sân' }
  }

  // ---- 1. Kiểm tra thời gian ----
  const startDate = new Date(startTimeISO)
  const endDate = new Date(endTimeISO)
  const now = Date.now()

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: 'Thời gian đặt sân không hợp lệ' }
  }
  if (endDate <= startDate) {
    return { error: 'Giờ kết thúc phải sau giờ bắt đầu' }
  }
  if (startDate.getTime() < now - 5 * 60 * 1000) {
    return { error: 'Không thể đặt khung giờ đã qua' }
  }
  if (startDate.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    return { error: `Chỉ nhận đặt trước tối đa ${MAX_DAYS_AHEAD} ngày` }
  }
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  if (durationHours > MAX_BOOKING_HOURS) {
    return { error: `Mỗi đơn đặt tối đa ${MAX_BOOKING_HOURS} giờ` }
  }

  // ---- 2. Lấy thông tin sân + bảng giá (RLS cho phép đọc công khai) ----
  const { data: court, error: courtError } = await supabase
    .from('courts')
    .select(`
      id, name, sport_type, base_price_per_hour, deposit_percentage, is_active,
      club:clubs ( id, name, open_time, close_time, is_active, plan, plan_until ),
      court_pricing_rules (*)
    `)
    .eq('id', courtId)
    .single()

  if (courtError || !court) {
    return { error: 'Không tìm thấy thông tin sân con' }
  }
  if (!court.is_active) {
    return { error: 'Sân này đang tạm ngưng hoạt động để bảo trì' }
  }

  // ---- 3. Phải nằm trong giờ mở cửa (theo giờ Việt Nam) ----
  const club = court.club as unknown as {
    id: string
    open_time: string
    close_time: string
    is_active: boolean
    plan: string
    plan_until: string | null
  } | null
  if (!club) {
    return { error: 'Không tìm thấy cụm sân của sân này' }
  }
  if (!club.is_active) {
    return { error: 'Cụm sân này đang tạm ngưng nhận đặt' }
  }

  // ---- 2b. Giới hạn theo gói thuê bao (chỉ áp dụng từ ngày BILLING_ENFORCED_FROM) ----
  const limit = courtLimit({
    plan: club.plan,
    planUntil: club.plan_until,
    now: new Date(now),
    enforced: isBillingEnforced(new Date(now)),
  })
  if (Number.isFinite(limit)) {
    const { data: siblings } = await supabase.from('courts').select('id, created_at, is_active').eq('club_id', club.id)
    if (!bookableCourtIds(siblings ?? [], limit).has(courtId)) {
      return { error: 'Sân này tạm thời không nhận đặt do cụm sân chưa gia hạn gói. Vui lòng chọn sân khác.' }
    }
  }
  const startVn = getVnParts(startDate)
  const endVn = getVnParts(endDate)
  const openMin = minutesFromTime(club?.open_time, 0)
  const closeMin = minutesFromTime(club?.close_time, 24 * 60)
  // Kết thúc đúng 00:00 hôm sau được tính là 24:00
  const crossesToNextDay = endVn.dateKey !== startVn.dateKey
  const endMinutes = crossesToNextDay && endVn.minutesOfDay === 0 ? 24 * 60 : endVn.minutesOfDay
  if ((crossesToNextDay && endVn.minutesOfDay !== 0) || startVn.minutesOfDay < openMin || endMinutes > closeMin) {
    return {
      error: `Khung giờ nằm ngoài giờ mở cửa (${club?.open_time?.slice(0, 5)} - ${club?.close_time?.slice(0, 5)})`,
    }
  }

  // ---- 4. Tính giá ở server (không tin số tiền từ client) ----
  const { totalPrice, depositAmount } = computePrice({
    start: startDate,
    end: endDate,
    basePricePerHour: court.base_price_per_hour,
    depositPercentage: court.deposit_percentage,
    rules: court.court_pricing_rules,
  })

  // ---- 5. Dọn các đơn quá hạn rồi giữ chỗ ----
  const admin = createAdminClient()

  // Kênh nhận cọc: PayOS riêng của cụm sân → kênh nền tảng (giai đoạn chạy thử) → giả lập (chỉ dev)
  let channel
  try {
    channel = await resolveClubChannel(admin, club.id)
  } catch (err) {
    console.error('createBooking: không đọc được cấu hình thanh toán của cụm sân', err)
    return { error: 'Cấu hình thanh toán của cụm sân đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ chủ sân.' }
  }
  if (!channel) {
    return { error: 'Cụm sân này chưa kết nối thanh toán online nên chưa nhận đặt sân. Vui lòng liên hệ chủ sân.' }
  }

  await admin.rpc('expire_pending_bookings')

  const { count: pendingCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')
  if ((pendingCount ?? 0) >= MAX_PENDING_PER_USER) {
    return { error: `Bạn đang giữ chỗ ${MAX_PENDING_PER_USER} đơn chưa cọc. Hãy hoàn tất hoặc chờ hết hạn rồi đặt thêm.` }
  }

  const isOpenMatch = Boolean(matchConfig?.isOpenMatch)
  const expiresAt = new Date(now + HOLD_MINUTES * 60 * 1000)

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      court_id: courtId,
      user_id: user.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      total_price: totalPrice,
      deposit_amount: depositAmount,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      is_open_match: isOpenMatch,
      note: note?.trim().slice(0, 500) || null,
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    // Chặn trùng lịch do ràng buộc PostgreSQL GiST Exclusion
    if (bookingError?.code === '23P01') {
      return { error: 'Khung giờ này vừa có người đặt hoặc đang giữ chỗ. Vui lòng chọn khung giờ khác!' }
    }
    console.error('createBooking: insert booking lỗi', bookingError)
    return { error: 'Không thể tạo đơn đặt sân. Vui lòng thử lại.' }
  }

  // Từ đây trở đi nếu có bước hỏng thì hủy đơn để nhả sân ngay
  const rollback = async () => {
    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    await admin.from('matches').update({ status: 'cancelled' }).eq('booking_id', booking.id)
  }

  // ---- 6. Mở ghép kèo cùng lúc đặt sân ----
  if (isOpenMatch && matchConfig) {
    const requiredPlayers = Math.min(50, Math.max(2, Math.floor(matchConfig.requiredPlayers || 2)))
    const costSharingType = matchConfig.costSharingType === 'host_covers' ? 'host_covers' : 'split'
    let costPerPerson = 0
    if (costSharingType === 'split') {
      const requested = Number(matchConfig.costPerPerson)
      costPerPerson =
        requested > 0 && requested <= totalPrice ? Math.round(requested) : Math.round(totalPrice / requiredPlayers)
    }

    const { error: matchError } = await admin.from('matches').insert({
      booking_id: booking.id,
      creator_id: user.id,
      title: matchConfig.title?.trim().slice(0, 100) || `Kèo ${court.name} - Giao lưu thể thao`,
      description: matchConfig.description?.trim().slice(0, 500) || null,
      sport_type: court.sport_type || 'football',
      skill_level: isMatchSkill(matchConfig.skillLevel) ? matchConfig.skillLevel : 'all',
      required_players: requiredPlayers,
      current_players: 1,
      cost_sharing_type: costSharingType,
      cost_per_person: costPerPerson,
      status: 'open',
    })

    if (matchError) {
      console.error('createBooking: insert match lỗi', matchError)
      await rollback()
      return { error: 'Không thể tạo kèo ghép. Vui lòng thử lại.' }
    }
  }

  // ---- 7. Tạo link thanh toán PayOS ----
  const { data: orderCode, error: seqError } = await admin.rpc('next_payos_order_code')
  if (seqError || orderCode == null) {
    console.error('createBooking: không cấp được orderCode', seqError)
    await rollback()
    return { error: 'Không thể khởi tạo thanh toán. Vui lòng thử lại.' }
  }

  const appUrl = resolveAppUrl()
  let paymentLink
  try {
    paymentLink = await createPaymentLink(
      {
        orderCode: Number(orderCode),
        amount: depositAmount,
        description: `SPORT ${orderCode}`,
        returnUrl: `${appUrl}/bookings/${booking.id}`,
        cancelUrl: `${appUrl}/bookings/${booking.id}`,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
      },
      channel.kind === 'simulation' ? null : channel.creds
    )
  } catch (err) {
    await rollback()
    return {
      error:
        err instanceof PaymentGatewayError ? err.message : 'Không thể tạo mã thanh toán. Vui lòng thử lại.',
    }
  }

  const { error: paymentError } = await admin.from('payments').insert({
    booking_id: booking.id,
    user_id: user.id,
    order_code: Number(orderCode),
    amount: depositAmount,
    status: 'pending',
    payment_method: 'vietqr_payos',
    qr_code_url: paymentLink.qrImageUrl,
    checkout_url: paymentLink.checkoutUrl,
    metadata: {
      bin: paymentLink.bin,
      account_number: paymentLink.accountNumber,
      account_name: paymentLink.accountName,
      description: paymentLink.description,
      payment_link_id: paymentLink.paymentLinkId,
      simulated: paymentLink.simulated,
      // Webhook dùng 2 trường này để biết kiểm tra chữ ký bằng khóa của kênh nào; sổ đối soát dùng để biết ai giữ tiền
      channel: channel.kind,
      club_id: club.id,
    },
  })

  if (paymentError) {
    console.error('createBooking: insert payment lỗi', paymentError)
    await rollback()
    return { error: 'Không thể lưu giao dịch thanh toán. Vui lòng thử lại.' }
  }

  revalidateBookingPages()
  return { bookingId: booking.id }
}

/**
 * Được gọi khi đồng hồ đếm ngược về 0. Không tin client: chỉ hủy những đơn đã thật sự quá hạn
 * (cron trong database cũng làm việc này mỗi phút).
 */
export async function cancelExpiredBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vui lòng đăng nhập' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || booking.user_id !== user.id) {
    return { error: 'Không tìm thấy đơn đặt sân' }
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('expire_pending_bookings')
  if (error) {
    console.error('cancelExpiredBooking lỗi', error)
    return { error: 'Không thể cập nhật trạng thái đơn' }
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidateBookingPages()
  return { success: true }
}

/**
 * Chỉ dành cho môi trường phát triển khi chưa cấu hình PayOS: giả lập việc khách đã chuyển khoản.
 * Ở production hàm này luôn từ chối.
 */
export async function simulateDepositPayment(bookingId: string) {
  if (!isPaymentSimulationEnabled()) {
    return { error: 'Tính năng giả lập thanh toán không khả dụng' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vui lòng đăng nhập' }

  const admin = createAdminClient()
  const { data: payment } = await admin
    .from('payments')
    .select('order_code, user_id, metadata')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!payment || payment.user_id !== user.id) {
    return { error: 'Không tìm thấy giao dịch của bạn' }
  }
  // Chỉ giả lập cho giao dịch được tạo ở chế độ giả lập, không bao giờ cho giao dịch PayOS thật
  if ((payment.metadata as { simulated?: boolean } | null)?.simulated !== true) {
    return { error: 'Giao dịch này là giao dịch thật, không thể giả lập' }
  }

  const result = await settlePayment({ orderCode: Number(payment.order_code), reference: `SIM_${Date.now()}` })
  if (!result.ok) return { error: result.error }
  return { success: true }
}
