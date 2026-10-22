/** Mã BIN ngân hàng (do PayOS/VietQR trả về) → tên hiển thị. */
const BANK_NAMES: Record<string, string> = {
  '970422': 'MB Bank',
  '970436': 'Vietcombank',
  '970415': 'VietinBank',
  '970418': 'BIDV',
  '970405': 'Agribank',
  '970407': 'Techcombank',
  '970423': 'TPBank',
  '970432': 'VPBank',
  '970416': 'ACB',
  '970403': 'Sacombank',
}

export function bankNameFromBin(bin: string | undefined | null): string | null {
  if (!bin) return null
  return BANK_NAMES[bin] ?? `Ngân hàng (BIN ${bin})`
}
