import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlanActions } from '@/components/admin/admin-forms'
import { isProActive } from '@/lib/billing'
import { formatDate } from '@/lib/format'

export const metadata = { title: 'Gói dịch vụ' }

// Quyền admin đã được kiểm tra ở app/admin/layout.tsx
export default async function AdminFinancePage() {
  // Trang chỉ dành cho admin nên dùng service_role để xem toàn bộ cụm sân
  const admin = createAdminClient()
  const { data: clubs } = await admin
    .from('clubs')
    .select('id, name, plan, plan_until, accepts_online_payment, owner:profiles!clubs_owner_id_fkey(full_name), courts(id, is_active)')
    .order('created_at', { ascending: true })

  const now = new Date()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Gói dịch vụ</h1>
        <p className="text-sm text-muted-foreground mt-1">Cấp hoặc gia hạn gói Pro cho từng cụm sân. Tiền cọc đặt sân đi thẳng vào tài khoản của chủ sân nên bạn không phải đối soát hay chuyển tiền.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cụm sân và gói dịch vụ</CardTitle>
          <CardDescription>Cấp hoặc gia hạn gói Pro thủ công, xem tình trạng kết nối thanh toán.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(clubs ?? []).map((club) => {
            const pro = isProActive(club.plan, club.plan_until, now)
            const active = (club.courts ?? []).filter((c) => c.is_active).length
            return (
              <div key={club.id} className="p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2 flex-wrap">
                    {club.name}
                    {pro ? (
                      <Badge className="bg-amber-400 text-slate-900">Pro đến {formatDate(club.plan_until!)}</Badge>
                    ) : (
                      <Badge variant="outline">Free</Badge>
                    )}
                    {club.accepts_online_payment ? (
                      <Badge className="bg-emerald-700 text-white">PayOS riêng</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-800 dark:text-amber-300 border-amber-500/40">Chưa kết nối, không nhận đặt sân</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Chủ sân: {club.owner?.full_name || '—'} · {active} sân đang hoạt động
                  </div>
                </div>
                <PlanActions clubId={club.id} />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
