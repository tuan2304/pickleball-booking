import { describe, expect, it } from 'vitest'
import { validatePricingRule } from './pricing-rule'

const ok = { courtId: 'c1', name: 'Giờ vàng', startTime: '17:00', endTime: '21:00', pricePerHour: 200000 }

describe('validatePricingRule', () => {
  it('nhận khung giá hợp lệ và làm tròn giá', () => {
    expect(validatePricingRule(ok)).toEqual({ ok: true, value: ok })
    const r = validatePricingRule({ ...ok, pricePerHour: 150000.6, startTime: '06:00:00' })
    expect(r.ok && r.value.pricePerHour).toBe(150001)
  })

  it('thiếu trường thì báo thiếu', () => {
    expect(validatePricingRule({ ...ok, name: '  ' }).ok).toBe(false)
    expect(validatePricingRule({ ...ok, courtId: undefined }).ok).toBe(false)
    expect(validatePricingRule({ ...ok, pricePerHour: undefined }).ok).toBe(false)
  })

  it('giờ sai định dạng hoặc đảo ngược', () => {
    for (const bad of ['25:00', '7:00', 'abc', '12:60', '']) {
      expect(validatePricingRule({ ...ok, startTime: bad }).ok).toBe(false)
    }
    expect(validatePricingRule({ ...ok, startTime: '21:00', endTime: '17:00' }).ok).toBe(false)
    expect(validatePricingRule({ ...ok, startTime: '17:00', endTime: '17:00' }).ok).toBe(false)
  })

  it('chặn giá âm, quá thấp, quá cao và không phải số', () => {
    for (const bad of [-1, 0, 999, 50_000_001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(validatePricingRule({ ...ok, pricePerHour: bad }).ok).toBe(false)
    }
    expect(validatePricingRule({ ...ok, pricePerHour: 1000 }).ok).toBe(true)
    expect(validatePricingRule({ ...ok, pricePerHour: 50_000_000 }).ok).toBe(true)
  })

  it('chặn tên quá dài', () => {
    expect(validatePricingRule({ ...ok, name: 'x'.repeat(81) }).ok).toBe(false)
  })
})
