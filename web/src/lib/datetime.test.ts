import { describe, expect, it } from 'vitest'
import { addDaysToDateKey, getVnParts, vnDateKey, vnDateTime } from './datetime'

describe('getVnParts', () => {
  it('đổi UTC sang giờ Việt Nam (+7)', () => {
    // 11:00 UTC thứ Sáu 23/10/2026 = 18:00 giờ VN
    const p = getVnParts(new Date('2026-10-23T11:00:00Z'))
    expect(p.dayOfWeek).toBe(5)
    expect(p.time).toBe('18:00:00')
    expect(p.dateKey).toBe('2026-10-23')
    expect(p.minutesOfDay).toBe(18 * 60)
  })

  it('qua nửa đêm VN thì sang ngày kế tiếp dù UTC vẫn là hôm trước', () => {
    // 17:30 UTC thứ Bảy 24/10 = 00:30 Chủ nhật 25/10 giờ VN
    const p = getVnParts(new Date('2026-10-24T17:30:00Z'))
    expect(p.dayOfWeek).toBe(0)
    expect(p.dateKey).toBe('2026-10-25')
    expect(p.time).toBe('00:30:00')
  })

  it('đúng nửa đêm là 00:00 chứ không phải 24:00', () => {
    const p = getVnParts(new Date('2026-10-23T17:00:00Z'))
    expect(p.time).toBe('00:00:00')
    expect(p.minutesOfDay).toBe(0)
    expect(p.dateKey).toBe('2026-10-24')
  })
})

describe('vnDateKey', () => {
  it('khác ngày UTC của toISOString() trước 7h sáng giờ VN (lỗi cũ của nút "Hôm nay")', () => {
    const at = new Date('2026-10-23T20:00:00Z') // 03:00 ngày 24/10 giờ VN
    expect(at.toISOString().split('T')[0]).toBe('2026-10-23')
    expect(vnDateKey(at)).toBe('2026-10-24')
  })

  it('nhận cả số mili-giây', () => {
    expect(vnDateKey(Date.parse('2026-10-23T20:00:00Z'))).toBe('2026-10-24')
  })
})

describe('addDaysToDateKey', () => {
  it('cộng và trừ ngày, qua tháng và qua năm', () => {
    expect(addDaysToDateKey('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('vnDateTime', () => {
  it('18:00 giờ VN ứng với 11:00 UTC', () => {
    expect(vnDateTime('2026-10-23', 18).toISOString()).toBe('2026-10-23T11:00:00.000Z')
  })

  it('hỗ trợ phút', () => {
    expect(vnDateTime('2026-10-23', 6, 30).toISOString()).toBe('2026-10-22T23:30:00.000Z')
  })
})
