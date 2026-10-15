import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifyPaymentWebhookData } from '@/lib/payos'
import { createNotification } from '@/app/actions/notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. Xác thực dữ liệu webhook từ PayOS hoặc Simulator
    let orderCode: number | null = null

    if (body.orderCode) {
      // Direct simulator format
      orderCode = Number(body.orderCode)
    } else {
      const verifiedData = verifyPaymentWebhookData(body)
      if (verifiedData && verifiedData.orderCode) {
        orderCode = Number(verifiedData.orderCode)
      }
    }

    if (!orderCode) {
      return NextResponse.json(
        { error: 'Dữ liệu webhook không hợp lệ hoặc thiếu orderCode' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 2. Tìm thông tin giao dịch trong database
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select(`
        id,
        order_code,
        booking_id,
        user_id,
        amount,
        status,
        booking:bookings (
          id,
          court_id,
          user_id,
          start_time,
          end_time,
          court:courts (
            id,
            name,
            club:clubs (
              id,
              name,
              owner_id
            )
          )
        )
      `)
      .eq('order_code', orderCode)
      .single()

    if (pErr || !payment) {
      return NextResponse.json(
        { error: `Không tìm thấy đơn thanh toán có mã ${orderCode}` },
        { status: 404 }
      )
    }

    // Nếu đã thanh toán rồi thì trả về thành công ngay
    if (payment.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Đơn này đã được xác nhận trước đó' })
    }

    // 3. Cập nhật trạng thái payment thành 'paid'
    const nowISO = new Date().toISOString()
    await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: nowISO,
        payos_transaction_id: body.data?.reference || `SIM_${Date.now()}`,
      })
      .eq('id', payment.id)

    // 4. Cập nhật trạng thái booking thành 'confirmed'
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
      })
      .eq('id', payment.booking_id)

    // 5. Gửi thông báo Real-time cho Người chơi & Chủ sân
    const booking = payment.booking as any
    const court = booking?.court
    const club = court?.club
    const courtName = court?.name || 'Sân tiêu chuẩn'
    const clubName = club?.name || 'Cụm sân'
    const ownerId = club?.owner_id

    // Thông báo cho Người chơi
    if (payment.user_id) {
      await createNotification({
        userId: payment.user_id,
        title: 'Thanh toán cọc thành công! 🎉',
        message: `Bạn đã cọc ${Number(payment.amount).toLocaleString('vi-VN')} đ cho sân ${courtName} (${clubName}). Sân của bạn đã được khóa lịch an toàn!`,
        type: 'payment',
        link: `/bookings/${payment.booking_id}`,
      })
    }

    // Thông báo cho Chủ sân
    if (ownerId) {
      await createNotification({
        userId: ownerId,
        title: 'Có đơn đặt sân mới! 💰',
        message: `Khách hàng vừa hoàn tất chuyển cọc ${Number(payment.amount).toLocaleString('vi-VN')} đ cho ${courtName} (${clubName}).`,
        type: 'booking',
        link: `/owner/schedule`,
      })
    }

    revalidatePath(`/bookings/${payment.booking_id}`)
    revalidatePath('/my-bookings')
    revalidatePath('/owner/schedule')
    revalidatePath('/owner/dashboard')

    return NextResponse.json({
      success: true,
      message: 'Xác nhận thanh toán và cập nhật lịch đặt sân thành công',
      orderCode,
    })
  } catch (error: any) {
    console.error('Lỗi xử lý webhook PayOS:', error)
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý máy chủ' },
      { status: 500 }
    )
  }
}
