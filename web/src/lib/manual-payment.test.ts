import { describe, expect, it } from 'vitest'
import { CLAIM_HOLD_HOURS, claimExpiry, isManualPayment } from './manual-payment'

const now = new Date('2026-11-01T08:00:00Z')
const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000)

describe('claimExpiry', () => {
  it('kéo dài giữ chỗ thêm CLAIM_HOLD_HOURS khi còn xa giờ chơi', () => {
    expect(claimExpiry(now, at(48), at(1)).getTime()).toBe(at(CLAIM_HOLD_HOURS).getTime())
  })

  it('không vượt quá giờ bắt đầu chơi', () => {
    expect(claimExpiry(now, at(2), at(0.5)).getTime()).toBe(at(2).getTime())
  })

  it('không bao giờ rút ngắn hạn hiện có', () => {
    expect(claimExpiry(now, at(48), at(10)).getTime()).toBe(at(10).getTime())
  })
})

describe('isManualPayment', () => {
  it('chỉ nhận kênh manual', () => {
    expect(isManualPayment({ metadata: { channel: 'manual' } })).toBe(true)
    expect(isManualPayment({ metadata: { channel: 'club' } })).toBe(false)
    expect(isManualPayment({ metadata: {} })).toBe(false)
    expect(isManualPayment(null)).toBe(false)
  })
})
