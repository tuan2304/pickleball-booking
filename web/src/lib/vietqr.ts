import { BANKS } from '@/lib/banks'

/**
 * VietQR tĩnh cho chuyển khoản thủ công (và QR của PayOS): ảnh QR chứa sẵn ngân hàng, số tài khoản,
 * số tiền và nội dung chuyển khoản, khách chỉ cần quét bằng app ngân hàng.
 */
export function buildVietQrImageUrl(p: {
  bin: string
  accountNumber: string
  accountName: string
  amount: number
  description: string
}): string {
  const qs = new URLSearchParams({
    amount: String(p.amount),
    addInfo: p.description,
    accountName: p.accountName,
  })
  return `https://img.vietqr.io/image/${p.bin}-${p.accountNumber}-compact2.png?${qs.toString()}`
}

/** Nội dung chuyển khoản để chủ sân đối chiếu đơn; ngắn, chỉ gồm chữ và số nên ngân hàng nào cũng nhận. */
export function transferMemo(orderCode: number): string {
  return `SPORT ${orderCode}`
}

export interface BankAccountInput {
  bin?: string | null
  accountNumber?: string | null
  accountName?: string | null
}

export type BankAccountResult =
  | { ok: true; value: { bin: string; accountNumber: string; accountName: string } }
  | { ok: false; error: string }

/** Bỏ dấu tiếng Việt và viết hoa, đúng dạng tên chủ tài khoản mà ngân hàng hiển thị. */
export function normalizeAccountName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

export function validateBankAccount(input: BankAccountInput): BankAccountResult {
  const bin = input.bin?.trim() ?? ''
  if (!BANKS.some((b) => b.bin === bin)) return { ok: false, error: 'Vui lòng chọn ngân hàng trong danh sách' }

  const accountNumber = (input.accountNumber ?? '').replace(/[\s.-]/g, '')
  if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, error: 'Số tài khoản chỉ gồm 6 đến 20 chữ số' }

  const accountName = normalizeAccountName(input.accountName ?? '')
  if (accountName.length < 2 || accountName.length > 60 || !/^[A-Z ]+$/.test(accountName)) {
    return { ok: false, error: 'Tên chủ tài khoản chỉ gồm chữ cái, từ 2 đến 60 ký tự' }
  }

  return { ok: true, value: { bin, accountNumber, accountName } }
}
