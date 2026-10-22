import { createClient } from '@/lib/supabase/server'

/**
 * Các kiểm tra quyền dùng chung cho Server Actions / trang quản trị.
 * Đặt ở lib (không phải 'use server') để không bị lộ thành endpoint công khai.
 */

/** Chủ của cụm sân. Dùng trước mọi thao tác ghi bằng service_role lên dữ liệu của cụm sân. */
export async function requireClubOwner(clubId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vui lòng đăng nhập' as const }

  const { data: club } = await supabase.from('clubs').select('id, owner_id, name').eq('id', clubId).maybeSingle()
  if (!club || club.owner_id !== user.id) {
    return { error: 'Bạn không phải chủ của cụm sân này' as const }
  }
  return { user, club }
}

/** Quản trị nền tảng (profiles.role = 'admin'). Vai trò này chỉ gán được bằng tay trong database. */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vui lòng đăng nhập' as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    return { error: 'Chỉ quản trị nền tảng mới được thực hiện thao tác này' as const }
  }
  return { user }
}
