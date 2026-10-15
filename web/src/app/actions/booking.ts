'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink } from '@/lib/payos'
import { createNotification } from '@/app/actions/notifications'

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

  const startDate = new Date(startTimeISO)
  const endDate = new Date(endTimeISO)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: 'Thời gian đặt sân không hợp lệ' }
  }

  if (endDate <= startDate) {
    return { error: 'Giờ kết thúc phải sau giờ bắt đầu' }
  }

  // 1. Lấy thông tin sân và bảng giá linh hoạt
  const { data: court, error: courtError } = await supabase
    .from('courts')
    .select(`
      id,
      name,
      sport_type,
      base_price_per_hour,
      deposit_percentage,
      is_active,
      club:clubs (
        id,
        name,
        open_time,
        close_time
      ),
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

  // 2. Tính toán tổng tiền theo giờ linh hoạt
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  const startHourStr = startDate.toTimeString().slice(0, 8)
  const dayOfWeek = startDate.getDay() // 0 = CN, 1 = T2, ...

  let applicablePricePerHour = Number(court.base_price_per_hour)

  // Kiểm tra nếu có khung giá linh hoạt áp dụng
  if (court.court_pricing_rules && court.court_pricing_rules.length > 0) {
    for (const rule of court.court_pricing_rules) {
      const days = rule.days_of_week || []
      if (days.includes(dayOfWeek)) {
        if (startHourStr >= rule.start_time && startHourStr < rule.end_time) {
          applicablePricePerHour = Number(rule.price_per_hour)
          break
        }
      }
    }
  }

  const totalPrice = Math.round(durationHours * applicablePricePerHour)
  const depositPercent = court.deposit_percentage || 30
  const depositAmount = Math.round((totalPrice * depositPercent) / 100)

  // 3. Tạo booking trong Database với hạn cọc 15 phút
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const isOpenMatch = Boolean(matchConfig?.isOpenMatch)

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      court_id: courtId,
      user_id: user.id,
      start_time: startTimeISO,
      end_time: endTimeISO,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      status: 'pending',
      expires_at: expiresAt,
      is_open_match: isOpenMatch,
      note: note || null,
    })
    .select('id')
    .single()

  if (bookingError) {
    // Chặn trùng lịch do ràng buộc PostgreSQL GiST Exclusion
    if (bookingError.code === '23P01') {
      return {
        error: 'Khung giờ này vừa có người đặt hoặc đang giữ chỗ. Vui lòng chọn khung giờ khác!',
      }
    }
    return { error: bookingError.message || 'Không thể tạo đơn đặt sân. Vui lòng thử lại.' }
  }

  // 3b. Nếu người dùng chọn mở ghép kèo ngay khi đặt sân
  if (isOpenMatch && matchConfig) {
    const requiredPlayers = Math.max(1, matchConfig.requiredPlayers || 2)
    let costPerPerson = matchConfig.costPerPerson ?? 0
    if (matchConfig.costSharingType === 'split' && !matchConfig.costPerPerson) {
      costPerPerson = Math.round(totalPrice / requiredPlayers)
    } else if (matchConfig.costSharingType === 'host_covers') {
      costPerPerson = 0
    }

    await supabase.from('matches').insert({
      booking_id: booking.id,
      creator_id: user.id,
      title: matchConfig.title?.trim() || `Kèo ${court.name} - Giao lưu thể thao`,
      description: matchConfig.description?.trim() || null,
      sport_type: court.sport_type || 'football',
      skill_level: matchConfig.skillLevel || 'all',
      required_players: requiredPlayers,
      current_players: 1,
      cost_sharing_type: matchConfig.costSharingType || 'split',
      cost_per_person: costPerPerson,
      status: 'open',
    })
  }

  // 4. Tạo record thanh toán PayOS
  const orderCode = Number(`${Date.now()}`.slice(-6)) + Math.floor(Math.random() * 1000)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const paymentLink = await createPaymentLink({
    orderCode,
    amount: depositAmount,
    description: `Coc san ${court.name}`.slice(0, 25),
    returnUrl: `${appUrl}/bookings/${booking.id}`,
    cancelUrl: `${appUrl}/bookings/${booking.id}`,
  })

  await supabase.from('payments').insert({
    booking_id: booking.id,
    user_id: user.id,
    order_code: orderCode,
    amount: depositAmount,
    status: 'pending',
    payment_method: 'vietqr_payos',
    qr_code_url: paymentLink.qrCode,
    checkout_url: paymentLink.checkoutUrl,
  })

  revalidatePath('/clubs')
  revalidatePath('/matches')
  revalidatePath('/my-bookings')
  revalidatePath('/owner/schedule')

  return { bookingId: booking.id }
}

export async function confirmBookingDeposit(bookingId: string) {
  const supabase = await createClient()

  // 1. Cập nhật booking thành confirmed
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .select(`
      id,
      user_id,
      court:courts (
        name,
        club:clubs (
          name,
          owner_id
        )
      )
    `)
    .single()

  if (bookingErr || !booking) {
    return { error: bookingErr?.message || 'Không tìm thấy đơn đặt' }
  }

  // 2. Cập nhật payment thành paid
  const { data: updatedPayment } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .select('amount')
    .maybeSingle()

  // 3. Gửi thông báo cho Người chơi & Chủ sân
  const courtData = booking.court as any
  const clubData = courtData?.club
  const courtName = courtData?.name || 'Sân'
  const clubName = clubData?.name || 'Cụm sân'
  const amountStr = updatedPayment ? Number(updatedPayment.amount).toLocaleString('vi-VN') : ''

  if (booking.user_id) {
    await createNotification({
      userId: booking.user_id,
      title: 'Thanh toán cọc thành công! 🎉',
      message: `Bạn đã cọc thành công ${amountStr} đ cho sân ${courtName} (${clubName}).`,
      type: 'payment',
      link: `/bookings/${bookingId}`,
    })
  }

  if (clubData?.owner_id) {
    await createNotification({
      userId: clubData.owner_id,
      title: 'Đơn đặt sân mới đã cọc! 💰',
      message: `Khách hàng vừa chuyển cọc ${amountStr} đ cho ${courtName} (${clubName}).`,
      type: 'booking',
      link: `/owner/schedule`,
    })
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath('/my-bookings')
  revalidatePath('/owner/schedule')
  return { success: true }
}

export async function cancelExpiredBooking(bookingId: string) {
  const supabase = await createClient()

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id, status, user_id, court:courts (name, club:clubs(name))')
    .eq('id', bookingId)
    .single()

  if (bErr || !booking) return { error: 'Không tìm thấy đơn đặt sân' }

  if (booking.status !== 'pending') {
    return { error: 'Đơn này không ở trạng thái chờ cọc' }
  }

  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('booking_id', bookingId)

  if (booking.user_id) {
    const court = booking.court as any
    const courtName = court?.name || 'Sân'
    const clubName = court?.club?.name || 'Cụm sân'

    await createNotification({
      userId: booking.user_id,
      title: 'Hết hạn giữ chỗ 15 phút ⏰',
      message: `Thời gian giữ chỗ sân ${courtName} (${clubName}) đã kết thúc do chưa nhận được cọc. Sân đã được giải phóng.`,
      type: 'booking',
      link: '/clubs',
    })
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath('/my-bookings')
  revalidatePath('/owner/schedule')

  return { success: true }
}
