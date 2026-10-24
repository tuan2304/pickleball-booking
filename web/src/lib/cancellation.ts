/**
 * Quy tắc hủy đơn và hoàn cọc. Thuần túy (không đụng database) để kiểm thử được mọi nhánh và để giao diện
 * dùng đúng cùng một logic khi báo trước cho người chơi họ sẽ được hoàn bao nhiêu.
 *
 * - Người chơi hủy: trước `freeCancelHours` giờ so với giờ chơi → hoàn đủ tiền đã cọc; muộn hơn → mất cọc.
 * - Chủ sân hủy: luôn hoàn đủ, vì sân không phục vụ được là lỗi của bên chủ sân.
 * - Đơn chưa cọc (pending) hủy lúc nào cũng được và không có gì để hoàn.
 */
export type CancelledBy = 'player' | 'owner'
export type RefundStatus = 'none' | 'pending' | 'refunded'

export const MIN_FREE_CANCEL_HOURS = 0
export const MAX_FREE_CANCEL_HOURS = 168
export const DEFAULT_FREE_CANCEL_HOURS = 24

export interface CancelInput {
  status: string
  start: Date
  now: Date
  /** Tổng tiền cọc thật đã nhận (bỏ qua khoản giả lập); 0 nếu chưa cọc */
  paidAmount: number
  freeCancelHours: number
  by: CancelledBy
}

export type CancelDecision =
  | { allowed: false; reason: string }
  | {
      allowed: true
      refundAmount: number
      refundStatus: Exclude<RefundStatus, 'refunded'>
      /** Người chơi hủy muộn nên mất cọc */
      forfeited: boolean
      hoursBeforeStart: number
    }

export function decideCancellation({ status, start, now, paidAmount, freeCancelHours, by }: CancelInput): CancelDecision {
  if (status !== 'pending' && status !== 'confirmed') {
    return { allowed: false, reason: 'Đơn này đã hủy hoặc đã hoàn thành nên không thể hủy nữa.' }
  }

  const hoursBeforeStart = (start.getTime() - now.getTime()) / 3_600_000
  if (by === 'player' && hoursBeforeStart <= 0) {
    return { allowed: false, reason: 'Đơn đã đến giờ chơi nên không thể tự hủy. Hãy liên hệ chủ sân nếu có sự cố.' }
  }

  const paid = Number.isFinite(paidAmount) && paidAmount > 0 ? Math.round(paidAmount) : 0
  // Chưa cọc, hoặc không có khoản thật nào (giả lập/tiền mặt): không có gì để hoàn hay để mất
  if (status === 'pending' || paid === 0) {
    return { allowed: true, refundAmount: 0, refundStatus: 'none', forfeited: false, hoursBeforeStart }
  }

  if (by === 'owner') {
    return { allowed: true, refundAmount: paid, refundStatus: 'pending', forfeited: false, hoursBeforeStart }
  }

  const free = hoursBeforeStart >= clampFreeCancelHours(freeCancelHours)
  return free
    ? { allowed: true, refundAmount: paid, refundStatus: 'pending', forfeited: false, hoursBeforeStart }
    : { allowed: true, refundAmount: 0, refundStatus: 'none', forfeited: true, hoursBeforeStart }
}

export function clampFreeCancelHours(hours: unknown): number {
  const n = Math.floor(Number(hours))
  if (!Number.isFinite(n)) return DEFAULT_FREE_CANCEL_HOURS
  return Math.min(MAX_FREE_CANCEL_HOURS, Math.max(MIN_FREE_CANCEL_HOURS, n))
}

export function parseFreeCancelHours(raw: unknown): { ok: true; hours: number } | { ok: false; error: string } {
  const text = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim()
  // Chuỗi rỗng/null không được ngầm hiểu là 0 giờ (tức là "hủy lúc nào cũng hoàn")
  const n = text === '' ? Number.NaN : Number(text)
  if (!Number.isInteger(n) || n < MIN_FREE_CANCEL_HOURS || n > MAX_FREE_CANCEL_HOURS) {
    return { ok: false, error: `Số giờ phải là số nguyên từ ${MIN_FREE_CANCEL_HOURS} đến ${MAX_FREE_CANCEL_HOURS}` }
  }
  return { ok: true, hours: n }
}

/** "24 giờ", "48 giờ (2 ngày)"... */
export function formatHours(hours: number): string {
  return hours >= 24 && hours % 24 === 0 ? `${hours} giờ (${hours / 24} ngày)` : `${hours} giờ`
}

/** Câu mô tả chính sách của cụm sân, hiện ở trang đặt sân. */
export function describePolicy(freeCancelHours: number): string {
  const h = clampFreeCancelHours(freeCancelHours)
  return h === 0
    ? 'Hủy miễn phí và được hoàn cọc bất cứ lúc nào trước giờ chơi.'
    : `Hủy trước giờ chơi ít nhất ${formatHours(h)} được hoàn cọc; hủy muộn hơn sẽ mất cọc. Chủ sân hủy thì luôn hoàn đủ.`
}

/** Thông báo kết quả cho người dùng ngay trước khi họ xác nhận hủy. */
export function describeOutcome(decision: CancelDecision, formatMoney: (n: number) => string): string {
  if (!decision.allowed) return decision.reason
  if (decision.refundStatus === 'pending') {
    return `Bạn sẽ được hoàn ${formatMoney(decision.refundAmount)}. Chủ sân sẽ chuyển lại tiền cọc cho bạn.`
  }
  if (decision.forfeited) {
    return 'Đơn nằm trong thời gian hủy muộn theo chính sách của cụm sân nên bạn sẽ không được hoàn cọc.'
  }
  return 'Đơn này chưa có khoản cọc nào nên không phát sinh hoàn tiền.'
}

export function refundStatusLabel(status: string, amount: number, formatMoney: (n: number) => string): string | null {
  if (status === 'pending') return `Chờ chủ sân hoàn cọc ${formatMoney(amount)}`
  if (status === 'refunded') return `Đã hoàn cọc ${formatMoney(amount)}`
  return null
}
