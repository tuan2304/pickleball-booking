import { describe, expect, it } from 'vitest'
import {
  bookableCourtIds,
  courtLimit,
  DEFAULT_PRO_PRICE_VND,
  FREE_COURT_LIMIT,
  getBillingStart,
  getProMonthlyPrice,
  isBillingEnforced,
  isProActive,
  subscriptionPrice,
} from './billing'

const NOW = new Date('2026-11-01T00:00:00Z')
const future = '2026-12-01T00:00:00Z'
const past = '2026-10-01T00:00:00Z'

describe('cấu hình', () => {
  it('chưa đặt BILLING_ENFORCED_FROM thì không thu phí', () => {
    expect(getBillingStart({})).toBeNull()
    expect(isBillingEnforced(NOW, getBillingStart({}))).toBe(false)
  })

  it('giá trị ngày sai thì coi như chưa bật thu phí', () => {
    expect(getBillingStart({ BILLING_ENFORCED_FROM: 'không phải ngày' })).toBeNull()
  })

  it('bắt đầu thu phí đúng từ ngày đã đặt', () => {
    const start = getBillingStart({ BILLING_ENFORCED_FROM: '2026-11-01T00:00:00Z' })
    expect(isBillingEnforced(new Date('2026-10-31T23:59:59Z'), start)).toBe(false)
    expect(isBillingEnforced(NOW, start)).toBe(true)
  })

  it('giá gói: dùng giá cấu hình, sai/quá nhỏ thì rơi về giá tạm', () => {
    expect(getProMonthlyPrice({ PRO_PLAN_PRICE_VND: '249000' })).toBe(249_000)
    expect(getProMonthlyPrice({ PRO_PLAN_PRICE_VND: 'abc' })).toBe(DEFAULT_PRO_PRICE_VND)
    expect(getProMonthlyPrice({ PRO_PLAN_PRICE_VND: '10' })).toBe(DEFAULT_PRO_PRICE_VND)
    expect(getProMonthlyPrice({})).toBe(DEFAULT_PRO_PRICE_VND)
  })
})

describe('isProActive', () => {
  it('chỉ pro còn hạn mới tính', () => {
    expect(isProActive('pro', future, NOW)).toBe(true)
    expect(isProActive('pro', past, NOW)).toBe(false)
    expect(isProActive('pro', null, NOW)).toBe(false)
    expect(isProActive('free', future, NOW)).toBe(false)
  })
})

describe('courtLimit', () => {
  it('chưa thu phí thì không giới hạn', () => {
    expect(courtLimit({ plan: 'free', planUntil: null, now: NOW, enforced: false })).toBe(Infinity)
  })

  it('thu phí: gói free bị giới hạn, pro còn hạn không giới hạn, pro hết hạn quay về giới hạn', () => {
    expect(courtLimit({ plan: 'free', planUntil: null, now: NOW, enforced: true })).toBe(FREE_COURT_LIMIT)
    expect(courtLimit({ plan: 'pro', planUntil: future, now: NOW, enforced: true })).toBe(Infinity)
    expect(courtLimit({ plan: 'pro', planUntil: past, now: NOW, enforced: true })).toBe(FREE_COURT_LIMIT)
  })
})

describe('bookableCourtIds', () => {
  const courts = [
    { id: 'c3', created_at: '2026-03-03T00:00:00Z', is_active: true },
    { id: 'c1', created_at: '2026-01-01T00:00:00Z', is_active: true },
    { id: 'c2', created_at: '2026-02-02T00:00:00Z', is_active: true },
  ]

  it('vượt giới hạn thì giữ các sân tạo sớm nhất', () => {
    expect([...bookableCourtIds(courts, 2)].sort()).toEqual(['c1', 'c2'])
  })

  it('không giới hạn thì giữ tất cả', () => {
    expect(bookableCourtIds(courts, Infinity).size).toBe(3)
  })

  it('sân đã tạm ngưng không chiếm chỗ trong giới hạn', () => {
    const list = [{ id: 'c1', created_at: '2026-01-01T00:00:00Z', is_active: false }, ...courts.filter((c) => c.id !== 'c1')]
    expect([...bookableCourtIds(list, 2)].sort()).toEqual(['c2', 'c3'])
  })
})

describe('subscriptionPrice', () => {
  it('nhân theo số tháng', () => {
    expect(subscriptionPrice(3, 199_000)).toBe(597_000)
  })
})
