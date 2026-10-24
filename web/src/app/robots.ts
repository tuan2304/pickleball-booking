import type { MetadataRoute } from 'next'
import { resolveAppUrl } from '@/lib/app-url'

// Khu vực cần đăng nhập hoặc chỉ có giá trị với riêng từng người: không cho thu thập
const PRIVATE_PATHS = ['/owner', '/admin', '/api', '/my-bookings', '/bookings', '/support', '/profile', '/login', '/register']

export default function robots(): MetadataRoute.Robots {
  const base = resolveAppUrl()
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    sitemap: `${base}/sitemap.xml`,
  }
}
