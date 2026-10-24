import { supabase } from './supabase'

/**
 * Gọi API của máy chủ web (Next.js). Ghi vào bảng đặt sân bị khóa với người dùng nên mọi thao tác ghi
 * (giữ chỗ, hủy đơn, báo đã chuyển khoản) đi qua đây; server tính giá và kiểm tra quy tắc, app không tự quyết số tiền.
 * Đặt EXPO_PUBLIC_API_URL trong mobile/.env (xem .env.example), ví dụ https://ten-mien-cua-ban.vercel.app
 */
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '')
const TIMEOUT_MS = 20_000

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number }

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  if (!API_URL) {
    return { ok: false, status: 0, error: 'Ứng dụng chưa cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_URL).' }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, status: 401, error: 'Vui lòng đăng nhập để tiếp tục.' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    })

    let json: any = null
    try {
      json = await res.json()
    } catch {
      // thân không phải JSON: rơi xuống thông báo chung bên dưới
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: json?.error ?? 'Máy chủ gặp sự cố. Vui lòng thử lại sau.' }
    }
    return { ok: true, data: json as T }
  } catch (err: any) {
    const timedOut = err?.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      error: timedOut ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.' : 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
    }
  } finally {
    clearTimeout(timer)
  }
}
