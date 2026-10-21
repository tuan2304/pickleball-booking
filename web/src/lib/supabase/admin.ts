import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Client dùng service_role: BỎ QUA RLS.
 * Chỉ import trong Server Actions / Route Handlers / lib phía server, và luôn phải tự
 * kiểm tra quyền của người gọi trước khi ghi. Tuyệt đối không import vào component client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
