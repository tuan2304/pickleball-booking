interface AvatarProps {
  name: string | null | undefined
  src: string | null | undefined
  /** Kích thước (px) của hình tròn */
  size?: number
  className?: string
}

/** Ảnh đại diện tròn; chưa có ảnh (hoặc ảnh không phải http/https) thì hiện chữ cái đầu của tên. */
export function Avatar({ name, src, size = 32, className = '' }: AvatarProps) {
  const safe = src && /^https?:\/\//i.test(src) ? src : null
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : 'U'
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }

  if (safe) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh đại diện nhỏ từ nhiều nguồn (Storage, Google), không cần tối ưu
      <img
        src={safe}
        alt=""
        style={style}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover border border-emerald-500/30 shrink-0 ${className}`}
      />
    )
  }
  return (
    <div
      aria-hidden
      style={style}
      className={`rounded-full bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/30 shrink-0 ${className}`}
    >
      {initial}
    </div>
  )
}
