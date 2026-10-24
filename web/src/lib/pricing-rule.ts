/**
 * Kiểm tra khung giá do chủ sân nhập ở phía server. Giao diện cũng có kiểm tra nhưng không thể tin client;
 * database chỉ chặn giá âm nên các giá trị vô lý khác (NaN, hàng tỷ đồng, giờ sai định dạng) phải chặn ở đây.
 */
export const MIN_PRICE_PER_HOUR = 1_000
export const MAX_PRICE_PER_HOUR = 50_000_000
const NAME_MAX = 80

export interface PricingRuleInput {
  courtId?: string | null
  name?: string | null
  startTime?: string | null
  endTime?: string | null
  pricePerHour?: number
}

export type PricingRuleResult =
  | { ok: true; value: { courtId: string; name: string; startTime: string; endTime: string; pricePerHour: number } }
  | { ok: false; error: string }

const TIME = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function validatePricingRule(input: PricingRuleInput): PricingRuleResult {
  const courtId = input.courtId?.trim()
  const name = input.name?.trim()
  const startTime = input.startTime?.trim()
  const endTime = input.endTime?.trim()
  const price = input.pricePerHour

  if (!courtId || !name || !startTime || !endTime || price === undefined) {
    return { ok: false, error: 'Vui lòng nhập đầy đủ thông tin khung giá' }
  }
  if (name.length > NAME_MAX) return { ok: false, error: `Tên khung giá tối đa ${NAME_MAX} ký tự` }
  if (!TIME.test(startTime) || !TIME.test(endTime)) return { ok: false, error: 'Giờ không đúng định dạng HH:MM' }
  if (minutes(startTime) >= minutes(endTime)) return { ok: false, error: 'Giờ kết thúc phải sau giờ bắt đầu' }
  if (!Number.isFinite(price) || price < MIN_PRICE_PER_HOUR || price > MAX_PRICE_PER_HOUR) {
    return { ok: false, error: 'Giá mỗi giờ phải từ 1.000 đ đến 50.000.000 đ' }
  }

  return { ok: true, value: { courtId, name, startTime, endTime, pricePerHour: Math.round(price) } }
}
