import { getVnParts } from '@/lib/datetime'

export interface PricingRule {
  start_time: string
  end_time: string
  days_of_week: number[] | null
  price_per_hour: number | string
}

export interface PriceInput {
  start: Date
  end: Date
  basePricePerHour: number | string
  depositPercentage: number | null
  rules: PricingRule[] | null
}

export interface PriceResult {
  pricePerHour: number
  totalPrice: number
  depositAmount: number
}

/**
 * Giá theo khung giờ của thời điểm bắt đầu (giờ Việt Nam). Khớp quy tắc nào đầu tiên dùng quy tắc đó,
 * không khớp thì dùng giá cơ bản của sân.
 */
export function computePrice({ start, end, basePricePerHour, depositPercentage, rules }: PriceInput): PriceResult {
  const { dayOfWeek, time } = getVnParts(start)
  let pricePerHour = Number(basePricePerHour)

  for (const rule of rules ?? []) {
    const days = rule.days_of_week ?? []
    if (days.includes(dayOfWeek) && time >= rule.start_time && time < rule.end_time) {
      pricePerHour = Number(rule.price_per_hour)
      break
    }
  }

  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const totalPrice = Math.round(hours * pricePerHour)
  // Chủ sân có thể đặt 0% cọc: chỉ dùng mặc định 30% khi chưa cấu hình
  const percent = depositPercentage ?? 30
  const depositAmount = Math.round((totalPrice * percent) / 100)

  return { pricePerHour, totalPrice, depositAmount }
}
