import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentWebhook } from '@/lib/payos'
import { settlePayment } from '@/lib/payments'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 })
  }

  // Bắt buộc có chữ ký hợp lệ của PayOS. Không còn nhánh "tin orderCode trong body".
  const verified = await verifyPaymentWebhook(body)
  if (!verified) {
    return NextResponse.json({ error: 'Chữ ký không hợp lệ' }, { status: 401 })
  }

  // Webhook báo giao dịch không thành công: ghi nhận đã nhận, không xác nhận cọc
  if (!verified.success) {
    return NextResponse.json({ success: true, message: 'Bỏ qua giao dịch không thành công' })
  }

  // Khi đăng ký URL, PayOS gửi thử một payload mẫu (đơn không tồn tại) và cần nhận 200
  const result = await settlePayment({
    orderCode: verified.orderCode,
    paidAmount: verified.amount,
    reference: verified.reference,
  })

  if (!result.ok) {
    if (result.status === 404) {
      return NextResponse.json({ success: true, message: result.error })
    }
    // 4xx/5xx để PayOS biết cần gọi lại
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, alreadyPaid: result.alreadyPaid ?? false })
}
