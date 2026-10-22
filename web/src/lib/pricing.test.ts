import { describe, expect, it } from 'vitest'
import { computePrice, type PricingRule } from './pricing'

const everyDay = [0, 1, 2, 3, 4, 5, 6]
const peak: PricingRule = {
  start_time: '17:00:00',
  end_time: '21:00:00',
  days_of_week: everyDay,
  price_per_hour: 200_000,
}

const base = { basePricePerHour: 100_000, depositPercentage: 30 }
const at = (iso: string) => new Date(iso)

describe('computePrice', () => {
  it('dùng giá cơ bản khi không có khung giá nào khớp', () => {
    // 09:00 giờ VN (02:00 UTC), 1 tiếng
    const r = computePrice({ ...base, start: at('2026-10-23T02:00:00Z'), end: at('2026-10-23T03:00:00Z'), rules: [peak] })
    expect(r).toEqual({ pricePerHour: 100_000, totalPrice: 100_000, depositAmount: 30_000, ruleApplied: false })
  })

  it('áp giá giờ vàng theo GIỜ VIỆT NAM dù server chạy UTC', () => {
    // 18:00 VN = 11:00 UTC. Nếu tính theo UTC thì 11:00 nằm ngoài khung 17-21 và sẽ sai giá.
    const r = computePrice({ ...base, start: at('2026-10-23T11:00:00Z'), end: at('2026-10-23T13:00:00Z'), rules: [peak] })
    expect(r.pricePerHour).toBe(200_000)
    expect(r.totalPrice).toBe(400_000)
    expect(r.depositAmount).toBe(120_000)
    expect(r.ruleApplied).toBe(true)
  })

  it('giờ kết thúc của khung giá là mốc loại trừ (21:00 không còn là giờ vàng)', () => {
    const r = computePrice({ ...base, start: at('2026-10-23T14:00:00Z'), end: at('2026-10-23T15:00:00Z'), rules: [peak] })
    expect(r.ruleApplied).toBe(false)
  })

  it('giờ bắt đầu của khung giá là mốc bao gồm (17:00 là giờ vàng)', () => {
    const r = computePrice({ ...base, start: at('2026-10-23T10:00:00Z'), end: at('2026-10-23T11:00:00Z'), rules: [peak] })
    expect(r.ruleApplied).toBe(true)
  })

  it('chỉ áp dụng đúng thứ trong tuần', () => {
    const weekend: PricingRule = { ...peak, days_of_week: [0, 6] }
    // Thứ Sáu 18:00 VN: không phải cuối tuần
    const fri = computePrice({ ...base, start: at('2026-10-23T11:00:00Z'), end: at('2026-10-23T12:00:00Z'), rules: [weekend] })
    expect(fri.ruleApplied).toBe(false)
    // Thứ Bảy 18:00 VN
    const sat = computePrice({ ...base, start: at('2026-10-24T11:00:00Z'), end: at('2026-10-24T12:00:00Z'), rules: [weekend] })
    expect(sat.ruleApplied).toBe(true)
  })

  it('00:30 sáng Chủ nhật giờ VN vẫn tính là Chủ nhật (UTC lúc đó còn là thứ Bảy)', () => {
    const sunday: PricingRule = { start_time: '00:00:00', end_time: '06:00:00', days_of_week: [0], price_per_hour: 150_000 }
    const r = computePrice({ ...base, start: at('2026-10-24T17:30:00Z'), end: at('2026-10-24T18:30:00Z'), rules: [sunday] })
    expect(r.pricePerHour).toBe(150_000)
  })

  it('tính theo số giờ lẻ', () => {
    const r = computePrice({ ...base, start: at('2026-10-23T02:00:00Z'), end: at('2026-10-23T03:30:00Z'), rules: [] })
    expect(r.totalPrice).toBe(150_000)
    expect(r.depositAmount).toBe(45_000)
  })

  it('cọc 0% là hợp lệ, chỉ null mới rơi về 30%', () => {
    const args = { basePricePerHour: 100_000, start: at('2026-10-23T02:00:00Z'), end: at('2026-10-23T03:00:00Z'), rules: [] }
    expect(computePrice({ ...args, depositPercentage: 0 }).depositAmount).toBe(0)
    expect(computePrice({ ...args, depositPercentage: null }).depositAmount).toBe(30_000)
  })

  it('chấp nhận giá dạng chuỗi (cột NUMERIC trả về string)', () => {
    const r = computePrice({
      basePricePerHour: '120000.00',
      depositPercentage: 50,
      start: at('2026-10-23T02:00:00Z'),
      end: at('2026-10-23T03:00:00Z'),
      rules: [],
    })
    expect(r.totalPrice).toBe(120_000)
    expect(r.depositAmount).toBe(60_000)
  })
})
