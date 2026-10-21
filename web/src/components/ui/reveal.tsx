'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from 'cn'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Thứ tự trong nhóm, dùng để so le thời gian xuất hiện */
  index?: number
}

/** Hiện dần phần tử khi cuộn tới (IntersectionObserver, chỉ chạy một lần). */
export function Reveal({ children, className, index = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ '--i': index } as CSSProperties}
    >
      {children}
    </div>
  )
}
