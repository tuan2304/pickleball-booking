import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber, formatTime, formatTimeRange, formatVnd } from './format'
import { isMatchSkill, skillInfo, sportLabel } from './constants'

describe('format', () => {
  it('định dạng tiền kiểu Việt Nam', () => {
    expect(formatNumber(1500000)).toBe('1.500.000')
    expect(formatVnd(1500000)).toBe('1.500.000 đ')
    expect(formatVnd('250000.00')).toBe('250.000 đ')
  })

  it('giá trị rỗng thành 0', () => {
    expect(formatVnd(null)).toBe('0 đ')
    expect(formatVnd(undefined)).toBe('0 đ')
  })

  it('giờ và ngày luôn theo giờ VN dù máy chạy UTC', () => {
    expect(process.env.TZ).toBe('UTC')
    expect(formatTime('2026-10-23T11:00:00Z')).toBe('18:00')
    expect(formatTimeRange('2026-10-23T11:00:00Z', '2026-10-23T13:30:00Z')).toBe('18:00 - 20:30')
    expect(formatDate('2026-10-23T11:00:00Z')).toBe('23/10/2026')
  })

  it('qua nửa đêm VN thì ngày hiển thị sang hôm sau', () => {
    expect(formatDate('2026-10-23T20:00:00Z')).toBe('24/10/2026')
  })
})

describe('constants', () => {
  it('nhãn môn thể thao, có giá trị dự phòng cho môn lạ', () => {
    expect(sportLabel('pickleball')).toBe('Pickleball')
    expect(sportLabel('cờ vua')).toBe('cờ vua')
  })

  it('trình độ kèo: nhận diện hợp lệ và dự phòng về "mọi trình độ"', () => {
    expect(isMatchSkill('beginner')).toBe(true)
    expect(isMatchSkill('pro')).toBe(false)
    expect(isMatchSkill(undefined)).toBe(false)
    expect(skillInfo('khong-co').label).toBe('Mọi trình độ')
  })
})
