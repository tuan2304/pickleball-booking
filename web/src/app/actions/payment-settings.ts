'use server'

import { revalidatePath } from 'next/cache'
import { requireClubOwner } from '@/lib/auth-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, EncryptionConfigError } from '@/lib/crypto'
import { PaymentGatewayError, registerWebhook } from '@/lib/payos'
import { resolveAppUrl } from '@/lib/app-url'

export interface SavePaymentSettingsInput {
  clientId: string
  apiKey: string
  checksumKey: string
}

export interface SavePaymentSettingsResult {
  error?: string
  success?: boolean
  /** Thông tin tài khoản nhận tiền do PayOS trả về, để chủ sân kiểm tra đúng tài khoản của mình */
  account?: { accountName: string; accountNumber: string; bankName: string }
}

/** Che gần hết số tài khoản khi hiển thị lại */
function maskAccount(n: string) {
  return n.length <= 4 ? n : `${'•'.repeat(n.length - 4)}${n.slice(-4)}`
}

export async function savePaymentSettings(clubId: string, input: SavePaymentSettingsInput): Promise<SavePaymentSettingsResult> {
  const auth = await requireClubOwner(clubId)
  if ('error' in auth) return { error: auth.error }

  const clientId = input.clientId?.trim()
  const apiKey = input.apiKey?.trim()
  const checksumKey = input.checksumKey?.trim()
  if (!clientId || !apiKey || !checksumKey) {
    return { error: 'Vui lòng nhập đủ Client ID, API Key và Checksum Key' }
  }
  if ([clientId, apiKey, checksumKey].some((v) => v.length > 200)) {
    return { error: 'Khóa nhập vào không hợp lệ' }
  }

  const appUrl = resolveAppUrl()
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(appUrl)) {
    return { error: 'Máy chủ chưa đặt NEXT_PUBLIC_APP_URL là tên miền thật nên chưa thể đăng ký webhook với PayOS.' }
  }

  let encrypted
  try {
    encrypted = { api: encryptSecret(apiKey), checksum: encryptSecret(checksumKey) }
  } catch (err) {
    if (err instanceof EncryptionConfigError) {
      console.error('savePaymentSettings:', err.message)
      return { error: 'Máy chủ chưa cấu hình mã hóa khóa thanh toán. Vui lòng liên hệ quản trị nền tảng.' }
    }
    throw err
  }

  // Đăng ký webhook cũng là phép thử khóa: sai khóa thì PayOS từ chối, ta không lưu gì cả
  let account
  try {
    account = await registerWebhook(`${appUrl}/api/payos/webhook`, { clientId, apiKey, checksumKey })
  } catch (err) {
    return { error: err instanceof PaymentGatewayError ? err.message : 'Không kết nối được với PayOS' }
  }

  const admin = createAdminClient()
  const { error: saveErr } = await admin.from('club_payment_settings').upsert({
    club_id: clubId,
    payos_client_id: clientId,
    payos_api_key_enc: encrypted.api,
    payos_checksum_key_enc: encrypted.checksum,
    verified_at: new Date().toISOString(),
  })
  if (saveErr) {
    console.error('savePaymentSettings: lưu lỗi', saveErr)
    return { error: 'Không lưu được cấu hình. Vui lòng thử lại.' }
  }
  await admin.from('clubs').update({ accepts_online_payment: true }).eq('id', clubId)

  revalidatePath('/owner/payments')
  revalidatePath('/clubs')
  revalidatePath(`/clubs/${clubId}`)
  return {
    success: true,
    account: { accountName: account.accountName, accountNumber: maskAccount(account.accountNumber), bankName: account.bankName },
  }
}

export async function removePaymentSettings(clubId: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireClubOwner(clubId)
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('club_payment_settings').delete().eq('club_id', clubId)
  if (error) {
    console.error('removePaymentSettings lỗi', error)
    return { error: 'Không ngắt kết nối được. Vui lòng thử lại.' }
  }
  await admin.from('clubs').update({ accepts_online_payment: false }).eq('id', clubId)

  revalidatePath('/owner/payments')
  revalidatePath('/clubs')
  revalidatePath(`/clubs/${clubId}`)
  return { success: true }
}
