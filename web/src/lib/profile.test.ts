import { describe, expect, it } from 'vitest'
import { normalizePhone, skillLabel, validateProfile } from './profile'

describe('normalizePhone', () => {
  it('chuẩn hóa các cách viết về 0xxxxxxxxx', () => {
    expect(normalizePhone('0912345678')).toBe('0912345678')
    expect(normalizePhone('091 234 5678')).toBe('0912345678')
    expect(normalizePhone('091.234.5678')).toBe('0912345678')
    expect(normalizePhone('+84912345678')).toBe('0912345678')
    expect(normalizePhone('84912345678')).toBe('0912345678')
    expect(normalizePhone('(091) 234-5678')).toBe('0912345678')
  })

  it('từ chối số sai độ dài hoặc có chữ', () => {
    for (const bad of ['', '12345', '09123456789', '091234567', 'abcdefghij', '+8491234', '1912345678']) {
      expect(normalizePhone(bad), bad).toBeNull()
    }
  })
})

describe('validateProfile', () => {
  const ok = { fullName: '  Nguyễn   Văn A ', phone: '0912 345 678', skillLevel: 'advanced' }

  it('nhận hồ sơ hợp lệ và chuẩn hóa', () => {
    expect(validateProfile(ok)).toEqual({ ok: true, value: { fullName: 'Nguyễn Văn A', phone: '0912345678', skillLevel: 'advanced' } })
  })

  it('số điện thoại có thể để trống', () => {
    expect(validateProfile({ ...ok, phone: '' })).toMatchObject({ ok: true, value: { phone: null } })
    expect(validateProfile({ ...ok, phone: null })).toMatchObject({ ok: true, value: { phone: null } })
  })

  it('từ chối tên quá ngắn, quá dài hoặc có ký tự HTML', () => {
    for (const bad of ['', 'A', '   ', 'x'.repeat(61), 'A <b>', 'a>b']) {
      expect(validateProfile({ ...ok, fullName: bad }).ok, bad).toBe(false)
    }
  })

  it('từ chối số điện thoại sai và trình độ lạ', () => {
    expect(validateProfile({ ...ok, phone: '123' }).ok).toBe(false)
    for (const bad of ['', 'god', 'all', undefined, null]) {
      expect(validateProfile({ ...ok, skillLevel: bad as string | null | undefined }).ok, String(bad)).toBe(false)
    }
  })
})

describe('skillLabel', () => {
  it('đổi mã sang nhãn tiếng Việt', () => {
    expect(skillLabel('pro')).toBe('Chuyên nghiệp')
    expect(skillLabel('beginner')).toBe('Mới chơi')
    expect(skillLabel(null)).toBe('Chưa cập nhật')
    expect(skillLabel('lạ')).toBe('Chưa cập nhật')
  })
})
