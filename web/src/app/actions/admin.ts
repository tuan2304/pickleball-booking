'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-guards'
import { notifyUser } from '@/lib/notify'
import { DAYS_PER_MONTH } from '@/lib/billing'
import { formatDate, formatVnd } from '@/lib/format'

/** Ghi nhận nền tảng đã chuyển tiền thu hộ cho chủ sân (sổ đối soát). Không tự chuyển tiền thật. */
export async function recordPayout(clubId: string, amount: number, note: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const value = Math.round(Number(amount))
  if (!Number.isFinite(value) || value <= 0) return { error: 'Số tiền phải lớn hơn 0' }

  const admin = createAdminClient()
  const { data: balances, error: balErr } = await admin.rpc('club_balances', { p_club_ids: [clubId] })
  const balance = balances?.[0]
  if (balErr || !balance) return { error: 'Không tra được số dư của cụm sân' }
  if (value > Number(balance.owed)) {
    return { error: `Chỉ còn nợ ${formatVnd(balance.owed)}, không thể ghi nhận chi ${formatVnd(value)}` }
  }

  const { error } = await admin.from('payouts').insert({
    club_id: clubId,
    amount: value,
    note: note?.trim().slice(0, 300) || null,
    created_by: auth.user.id,
  })
  if (error) {
    console.error('recordPayout lỗi', error)
    return { error: 'Không ghi nhận được khoản chi' }
  }

  const { data: club } = await admin.from('clubs').select('owner_id, name').eq('id', clubId).maybeSingle()
  if (club) {
    await notifyUser({
      userId: club.owner_id,
      title: 'Nền tảng đã chuyển tiền cọc cho bạn',
      message: `Đã chuyển ${formatVnd(value)} tiền cọc thu hộ của "${club.name}"${note ? ` (${note.trim().slice(0, 100)})` : ''}.`,
      type: 'payment',
      link: '/owner/payments',
    })
  }

  revalidatePath('/admin')
  revalidatePath('/owner/payments')
  return { success: true }
}

/** Cấp/gia hạn gói Pro thủ công (vd. chủ sân chuyển khoản trực tiếp, hoặc tặng thời gian dùng thử). */
export async function grantPlan(clubId: string, months: number): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!Number.isInteger(months) || months < 1 || months > 24) return { error: 'Số tháng phải từ 1 đến 24' }

  const admin = createAdminClient()
  const { data: club } = await admin.from('clubs').select('owner_id, name, plan_until').eq('id', clubId).maybeSingle()
  if (!club) return { error: 'Không tìm thấy cụm sân' }

  const base = Math.max(Date.now(), club.plan_until ? new Date(club.plan_until).getTime() : 0)
  const until = new Date(base + months * DAYS_PER_MONTH * 24 * 60 * 60 * 1000)

  const { error } = await admin.from('clubs').update({ plan: 'pro', plan_until: until.toISOString() }).eq('id', clubId)
  if (error) return { error: 'Không cập nhật được gói' }

  await notifyUser({
    userId: club.owner_id,
    title: 'Gói Pro đã được kích hoạt',
    message: `Cụm sân "${club.name}" dùng gói Pro đến ${formatDate(until)}.`,
    type: 'system',
    link: '/owner/billing',
  })

  revalidatePath('/admin')
  revalidatePath('/owner/billing')
  return { success: true }
}

export async function setFreePlan(clubId: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('clubs').update({ plan: 'free', plan_until: null }).eq('id', clubId)
  if (error) return { error: 'Không cập nhật được gói' }

  revalidatePath('/admin')
  revalidatePath('/owner/billing')
  return { success: true }
}
