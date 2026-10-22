import Image from 'next/image'

// Khớp với images.remotePatterns trong next.config.ts
function isOptimizable(src: string) {
  try {
    const { protocol, hostname } = new URL(src)
    return protocol === 'https:' && (hostname === 'images.unsplash.com' || hostname.endsWith('.supabase.co'))
  } catch {
    return false
  }
}

interface RemoteImageProps {
  src: string
  alt: string
  className?: string
  sizes: string
  priority?: boolean
}

/**
 * Ảnh phủ kín khung cha (cha cần `relative` và có chiều cao).
 * Domain đã whitelist → qua trình tối ưu của Next (nén, đúng kích thước, lazy-load).
 * Domain khác (chủ sân tự nhập URL) → giữ thẻ <img> để không bị lỗi.
 */
export function RemoteImage({ src, alt, className, sizes, priority }: RemoteImageProps) {
  if (isOptimizable(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} className={`absolute inset-0 w-full h-full ${className ?? ''}`} />
}
