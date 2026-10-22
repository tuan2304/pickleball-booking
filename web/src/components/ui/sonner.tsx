'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useResolvedTheme } from '@/components/theme/theme-toggle'

/**
 * Thông báo nhỏ hiện ở góc trên giữa màn hình, tự tắt sau vài giây. Thay cho hộp thoại alert() mặc định của trình duyệt.
 * Dùng: import { toast } from 'sonner' rồi toast.success / toast.error / toast.warning / toast.info.
 * Được đọc cho trình đọc màn hình (aria-live) và có nút đóng.
 */
export function Toaster(props: ToasterProps) {
  const theme = useResolvedTheme()
  return (
    <Sonner
      position="top-center"
      theme={theme}
      richColors
      closeButton
      duration={5000}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !shadow-lg !font-sans !border',
          title: '!text-sm !font-semibold',
          description: '!text-xs',
        },
      }}
      style={{ fontFamily: 'var(--font-sans)' }}
      {...props}
    />
  )
}
