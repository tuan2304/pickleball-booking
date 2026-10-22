import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { decryptSecret } from '@/lib/crypto'
import { getPlatformCredentials, isPayOSConfigured, isPaymentSimulationEnabled, type PayosCredentials } from '@/lib/payos'

/**
 * Kênh nhận tiền cọc của một cụm sân:
 *  - club:       chủ sân tự kết nối PayOS → tiền về thẳng tài khoản của họ
 *  - platform:   cụm sân chưa kết nối → tiền về kênh của nền tảng, nền tảng chi lại sau (xem bảng payouts)
 *  - simulation: môi trường dev chưa có khóa nào → QR mẫu và nút giả lập
 */
export type PaymentChannel =
  | { kind: 'club'; clubId: string; creds: PayosCredentials }
  | { kind: 'platform'; creds: PayosCredentials }
  | { kind: 'simulation' }

type Admin = SupabaseClient<Database>

async function loadClubCredentials(admin: Admin, clubId: string): Promise<{ creds: PayosCredentials; verified: boolean } | null> {
  const { data } = await admin
    .from('club_payment_settings')
    .select('payos_client_id, payos_api_key_enc, payos_checksum_key_enc, verified_at')
    .eq('club_id', clubId)
    .maybeSingle()

  if (!data) return null
  return {
    verified: data.verified_at !== null,
    creds: {
      clientId: data.payos_client_id,
      apiKey: decryptSecret(data.payos_api_key_enc),
      checksumKey: decryptSecret(data.payos_checksum_key_enc),
    },
  }
}

/** Chọn kênh để tạo đơn thanh toán mới. Trả null nếu cụm sân không thể nhận thanh toán online. */
export async function resolveClubChannel(admin: Admin, clubId: string): Promise<PaymentChannel | null> {
  const own = await loadClubCredentials(admin, clubId)
  if (own?.verified) return { kind: 'club', clubId, creds: own.creds }

  const platform = getPlatformCredentials()
  if (platform) return { kind: 'platform', creds: platform }

  if (isPaymentSimulationEnabled()) return { kind: 'simulation' }
  return null
}

/**
 * Lấy khóa của kênh đã ghi trên một khoản thanh toán cũ, dùng để kiểm tra chữ ký webhook.
 * Cụm sân đổi hoặc xóa khóa sau khi khách đã nhận QR vẫn không làm hỏng các đơn đang chờ vì khóa cũ được giữ
 * cho đến khi chủ sân thay bằng khóa mới; khi đó các đơn cũ cần xử lý tay.
 */
export async function credentialsForStoredChannel(
  admin: Admin,
  channel: string | undefined,
  clubId: string | undefined
): Promise<PayosCredentials | null> {
  if (channel === 'club' && clubId) {
    return (await loadClubCredentials(admin, clubId))?.creds ?? null
  }
  if (channel === 'simulation') return null
  return getPlatformCredentials()
}

/** Cụm sân có nhận đặt sân online được không (để ẩn/hiện form đặt ở giao diện). */
export function canAcceptBookings(acceptsOnlinePayment: boolean): boolean {
  return acceptsOnlinePayment || isPayOSConfigured() || isPaymentSimulationEnabled()
}
