import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Các hàm bọc bằng React.cache chỉ chạy một lần cho mỗi request, dù được gọi từ layout,
 * header và trang cùng lúc. Trước đây mỗi nơi tự gọi getUser() (một lượt đi về tới Supabase Singapore).
 */
export const getSupabase = cache(async () => createClient())

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  return data
})
