/**
 * Nguồn ảnh được phép qua trình tối ưu ảnh của Next (/_next/image). Phải khớp images.remotePatterns trong next.config.ts.
 * Chỉ cho đúng project Supabase của mình thay vì mọi *.supabase.co, để dự án của người khác không dùng
 * máy chủ này làm proxy ảnh (tốn băng thông và mở rộng bề mặt tấn công của bộ tối ưu ảnh).
 */
export const UNSPLASH_HOST = 'images.unsplash.com'

export function supabaseHost(url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  try {
    return url ? new URL(url).hostname : null
  } catch {
    return null
  }
}

export function isOptimizableImage(src: string, supabase: string | null = supabaseHost()): boolean {
  try {
    const { protocol, hostname } = new URL(src)
    return protocol === 'https:' && (hostname === UNSPLASH_HOST || (supabase !== null && hostname === supabase))
  } catch {
    return false
  }
}
