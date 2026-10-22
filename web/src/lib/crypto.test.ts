import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { decryptSecret, encryptSecret, EncryptionConfigError } from './crypto'

const KEY = randomBytes(32).toString('base64')

describe('encryptSecret / decryptSecret', () => {
  it('giải mã ra đúng nội dung ban đầu', () => {
    const token = encryptSecret('khoa-bi-mat-payos-123', KEY)
    expect(decryptSecret(token, KEY)).toBe('khoa-bi-mat-payos-123')
  })

  it('bản mã không chứa bản rõ', () => {
    const token = encryptSecret('khoa-bi-mat-payos-123', KEY)
    expect(token).not.toContain('khoa-bi-mat')
    expect(token.startsWith('v1.')).toBe(true)
  })

  it('mỗi lần mã hóa cho kết quả khác nhau (IV ngẫu nhiên)', () => {
    expect(encryptSecret('abc', KEY)).not.toBe(encryptSecret('abc', KEY))
  })

  it('giải mã bằng khóa sai thì lỗi', () => {
    const token = encryptSecret('abc', KEY)
    expect(() => decryptSecret(token, randomBytes(32).toString('base64'))).toThrow()
  })

  it('bản mã bị sửa đổi thì bị phát hiện', () => {
    const [v, iv, tag, data] = encryptSecret('abc', KEY).split('.')
    const tampered = [v, iv, tag, Buffer.from('xyz').toString('base64url') + data].join('.')
    expect(() => decryptSecret(tampered, KEY)).toThrow()
  })

  it('báo lỗi rõ ràng khi chưa cấu hình hoặc khóa sai độ dài', () => {
    expect(() => encryptSecret('abc', undefined)).toThrow(EncryptionConfigError)
    expect(() => encryptSecret('abc', Buffer.from('ngan').toString('base64'))).toThrow(EncryptionConfigError)
  })

  it('xử lý được ký tự tiếng Việt', () => {
    expect(decryptSecret(encryptSecret('Đặt sân 🏸', KEY), KEY)).toBe('Đặt sân 🏸')
  })
})
