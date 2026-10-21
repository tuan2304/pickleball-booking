import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from '@/types/database'

/**
 * Tạo thông báo cho một người dùng. Đặt ở lib (không phải 'use server') để KHÔNG bị lộ thành
 * endpoint công khai: nếu là Server Action, ai cũng gọi được và spam thông báo cho người khác.
 */
export async function notifyUser(params: {
  userId: string
  title: string
  message: string
  type?: NotificationType
  link?: string
}) {
  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type || 'system',
    link: params.link || null,
    is_read: false,
  })

  if (error) {
    console.error('Không tạo được thông báo:', error)
    return false
  }
  return true
}
