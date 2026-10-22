/**
 * Địa chỉ gốc của web, dùng làm returnUrl/cancelUrl gửi cho PayOS (khách được chuyển về đây sau khi thanh toán).
 *
 * Ưu tiên: NEXT_PUBLIC_APP_URL → domain production của Vercel → localhost.
 * NEXT_PUBLIC_APP_URL có thể bị dán thành nhiều địa chỉ ngăn bằng ; hoặc , nên chỉ lấy địa chỉ hợp lệ đầu tiên.
 */
export function resolveAppUrl(env: Record<string, string | undefined> = process.env): string {
  const candidates = [
    ...(env.NEXT_PUBLIC_APP_URL ?? '').split(/[;,\s]+/),
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
  ]

  for (const raw of candidates) {
    const value = raw.trim()
    if (!value) continue
    try {
      const url = new URL(value)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.origin
      }
    } catch {
      // bỏ qua giá trị không phải URL
    }
  }
  return 'http://localhost:3000'
}
