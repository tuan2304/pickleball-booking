import { describe, expect, it } from 'vitest'
import { buildVietQrImageUrl, normalizeAccountName, transferMemo, validateBankAccount } from './vietqr'

describe('buildVietQrImageUrl', () => {
  it('dựng URL ảnh QR có đủ tham số và mã hóa đúng', () => {
    const url = buildVietQrImageUrl({ bin: '970422', accountNumber: '0123456789', accountName: 'NGUYEN VAN A', amount: 30000, description: 'SPORT 10000001' })
    expect(url.startsWith('https://img.vietqr.io/image/970422-0123456789-compact2.png?')).toBe(true)
    const q = new URL(url).searchParams
    expect(q.get('amount')).toBe('30000')
    expect(q.get('addInfo')).toBe('SPORT 10000001')
    expect(q.get('accountName')).toBe('NGUYEN VAN A')
  })
})

describe('transferMemo', () => {
  it('chỉ gồm chữ và số', () => {
    expect(transferMemo(10000042)).toBe('SPORT 10000042')
    expect(transferMemo(7)).toMatch(/^[A-Z0-9 ]+$/)
  })
})

describe('normalizeAccountName', () => {
  it('bỏ dấu, đổi đ, viết hoa, gộp khoảng trắng', () => {
    expect(normalizeAccountName('  Nguyễn  Văn Đạt ')).toBe('NGUYEN VAN DAT')
    expect(normalizeAccountName('trần thị b')).toBe('TRAN THI B')
  })
})

describe('validateBankAccount', () => {
  const ok = { bin: '970436', accountNumber: '0987 654 321', accountName: 'Trần Thị Bình' }

  it('chuẩn hóa số tài khoản và tên', () => {
    expect(validateBankAccount(ok)).toEqual({ ok: true, value: { bin: '970436', accountNumber: '0987654321', accountName: 'TRAN THI BINH' } })
  })

  it('từ chối ngân hàng ngoài danh sách', () => {
    expect(validateBankAccount({ ...ok, bin: '123456' }).ok).toBe(false)
    expect(validateBankAccount({ ...ok, bin: '' }).ok).toBe(false)
    expect(validateBankAccount({ ...ok, bin: undefined }).ok).toBe(false)
  })

  it('từ chối số tài khoản sai định dạng', () => {
    for (const bad of ['12345', 'abc123456', '1'.repeat(21), '', '12 34 5']) {
      expect(validateBankAccount({ ...ok, accountNumber: bad }).ok, bad).toBe(false)
    }
  })

  it('từ chối tên có số/ký tự lạ hoặc quá ngắn, quá dài', () => {
    for (const bad of ['', 'A', 'Nguyen 123', 'A<script>', 'X'.repeat(61)]) {
      expect(validateBankAccount({ ...ok, accountName: bad }).ok, bad).toBe(false)
    }
  })
})
