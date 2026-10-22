/**
 * Quy tắc thuê bao theo cụm sân (Giai đoạn 12).
 *
 *  - Gói free: tối đa FREE_COURT_LIMIT sân con đang hoạt động.
 *  - Gói pro:  không giới hạn sân con, có hạn dùng (plan_until).
 *  - Chỉ áp dụng giới hạn từ ngày BILLING_ENFORCED_FROM. Trước ngày đó (hoặc khi chưa đặt) mọi cụm sân đều dùng
 *    miễn phí và không bị giới hạn, đúng kế hoạch "miễn phí giai đoạn đầu để thu hút chủ sân".
 */

export const FREE_COURT_LIMIT = 2
/** Mỗi lần gia hạn tính 30 ngày (khớp apply_subscription_payment trong database) */
export const DAYS_PER_MONTH = 30
/** Số tháng cho phép mua một lần */
export const SUBSCRIPTION_MONTH_OPTIONS = [1, 3, 12] as const

export type BillingEnv = Record<string, string | undefined>

/** Giá mặc định chỉ là GIÁ TẠM, hãy đặt PRO_PLAN_PRICE_VND theo quyết định kinh doanh của bạn. */
export const DEFAULT_PRO_PRICE_VND = 199_000

export function getProMonthlyPrice(env: BillingEnv = process.env): number {
  const value = Number(env.PRO_PLAN_PRICE_VND)
  return Number.isFinite(value) && value >= 2000 ? Math.round(value) : DEFAULT_PRO_PRICE_VND
}

/** Ngày bắt đầu thu phí; null nếu chưa đặt hoặc đặt sai (khi đó không thu phí). */
export function getBillingStart(env: BillingEnv = process.env): Date | null {
  if (!env.BILLING_ENFORCED_FROM) return null
  const date = new Date(env.BILLING_ENFORCED_FROM)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isBillingEnforced(now: Date, start: Date | null = getBillingStart()): boolean {
  return start !== null && now.getTime() >= start.getTime()
}

export function isProActive(plan: string, planUntil: string | null, now: Date): boolean {
  return plan === 'pro' && planUntil !== null && new Date(planUntil).getTime() > now.getTime()
}

/** Số sân con đang hoạt động tối đa được phép bán. Infinity = không giới hạn. */
export function courtLimit(args: { plan: string; planUntil: string | null; now: Date; enforced: boolean }): number {
  if (!args.enforced) return Infinity
  return isProActive(args.plan, args.planUntil, args.now) ? Infinity : FREE_COURT_LIMIT
}

/**
 * Các sân con được phép nhận đặt khi vượt giới hạn: lấy theo thứ tự tạo sân (cũ trước), bỏ qua sân đã tạm ngưng.
 * Sân vượt giới hạn không bị xóa, chỉ không nhận đặt cho đến khi gia hạn gói.
 */
export function bookableCourtIds(courts: Array<{ id: string; created_at: string; is_active: boolean }>, limit: number): Set<string> {
  const active = courts
    .filter((c) => c.is_active)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return new Set((Number.isFinite(limit) ? active.slice(0, limit) : active).map((c) => c.id))
}

export function subscriptionPrice(months: number, monthlyPrice: number): number {
  return Math.round(months * monthlyPrice)
}
