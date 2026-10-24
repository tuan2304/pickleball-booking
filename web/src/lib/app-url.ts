/**
 * Địa chỉ gốc của web, dùng làm returnUrl/cancelUrl gửi cho PayOS (khách được chuyển về đây sau khi thanh toán)
 * và làm Webhook URL khi chủ sân kết nối PayOS.
 *
 * Ưu tiên: NEXT_PUBLIC_APP_URL → domain production do Vercel cung cấp (VERCEL_PROJECT_PRODUCTION_URL) → localhost.
 * - NEXT_PUBLIC_APP_URL có thể bị dán thành nhiều địa chỉ ngăn bằng ; hoặc , nên đọc cả danh sách.
 * - Địa chỉ localhost chỉ được dùng khi KHÔNG còn địa chỉ thật nào khác: trên Vercel, biến lỡ đặt thành localhost
 *   (vd. copy từ .env.local) sẽ bị bỏ qua nếu Vercel cung cấp domain thật.
 */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.includes(hostname)
}

export function resolveAppUrl(env: Record<string, string | undefined> = process.env): string {
  const candidates = [
    ...(env.NEXT_PUBLIC_APP_URL ?? '').split(/[;,\s]+/),
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
  ]

  const valid: URL[] = []
  for (const raw of candidates) {
    const value = raw.trim()
    if (!value) continue
    try {
      const url = new URL(value)
      if (url.protocol === 'http:' || url.protocol === 'https:') valid.push(url)
    } catch {
      // bỏ qua giá trị không phải URL
    }
  }

  const real = valid.find((u) => !isLocalHost(u.hostname))
  if (real) return real.origin
  return valid[0]?.origin ?? 'http://localhost:3000'
}
