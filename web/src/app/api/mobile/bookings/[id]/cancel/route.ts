import type { NextRequest } from 'next/server'
import { authenticateMobile, jsonResponse, unauthorized } from '@/lib/mobile-auth'
import { isUuid } from '@/lib/mobile-api'
import { cancelBookingAsPlayer } from '@/lib/booking-cancel'

/** Người chơi hủy đơn của chính mình; quy tắc hoàn cọc do chính sách của cụm sân quyết định. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateMobile(request)
  if (!auth) return unauthorized()

  const { id } = await params
  if (!isUuid(id)) return jsonResponse({ error: 'Mã đơn không hợp lệ' }, 400)

  const result = await cancelBookingAsPlayer(auth.user.id, id)
  if (result.error) return jsonResponse({ error: result.error }, 400)
  return jsonResponse({ success: true, refundAmount: result.refundAmount ?? 0, forfeited: Boolean(result.forfeited) })
}
