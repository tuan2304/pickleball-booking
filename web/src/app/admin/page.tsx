import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getCurrentProfile } from '@/lib/supabase/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PayoutForm, PlanActions } from '@/components/admin/admin-forms'
import { isProActive } from '@/lib/billing'
import { formatDate, formatVnd } from '@/lib/format'
import { ShieldCheck } from 'lucide-react'

export const metadata = { title: 'Quản trị nền tảng' }

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin')
  const profile = await getCurrentProfile()
  if (profile?.role !== 'admin') redirect('/')

  // Trang chỉ dành cho admin nên dùng service_role để xem toàn bộ cụm sân
  const admin = createAdminClient()
  const { data: clubs } = await admin
    .from('clubs')
    .select('id, name, plan, plan_until, accepts_online_payment, owner:profiles!clubs_owner_id_fkey(full_name), courts(id, is_active)')
    .order('created_at', { ascending: true })
  const { data: balances } = await admin.rpc('club_balances')
  const balanceByClub = new Map((balances ?? []).map((b) => [b.club_id, b]))

   
  const now = new Date()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden /> Quản trị SportArena
          </span>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">Về trang chủ</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Tiền cọc nền tảng đang thu hộ</CardTitle>
            <CardDescription>
              Chỉ gồm các khoản cọc thật đã thanh toán qua kênh PayOS của nền tảng (cụm sân chưa tự kết nối PayOS).
              Hệ thống không tự chuyển tiền: hãy chuyển khoản cho chủ sân rồi bấm &quot;Ghi nhận đã chuyển&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(clubs ?? []).map((club) => {
              const b = balanceByClub.get(club.id)
              if (!b || (Number(b.collected) === 0 && Number(b.paid_out) === 0)) return null
              return (
                <div key={club.id} className="p-4 rounded-xl border border-border space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold">{club.name}</div>
                      <div className="text-xs text-muted-foreground">Chủ sân: {club.owner?.full_name || '—'}</div>
                    </div>
                    <div className="flex gap-4 text-xs text-right">
                      <div><div className="text-muted-foreground">Đã thu hộ</div><b>{formatVnd(b.collected)}</b></div>
                      <div><div className="text-muted-foreground">Đã chi</div><b>{formatVnd(b.paid_out)}</b></div>
                      <div><div className="text-muted-foreground">Còn nợ chủ sân</div><b className="text-emerald-700 dark:text-emerald-400">{formatVnd(b.owed)}</b></div>
                    </div>
                  </div>
                  <PayoutForm clubId={club.id} owed={Number(b.owed)} />
                </div>
              )
            })}
            {(balances ?? []).every((b) => Number(b.collected) === 0 && Number(b.paid_out) === 0) && (
              <p className="text-sm text-muted-foreground">Chưa có khoản cọc nào do nền tảng thu hộ.</p>
            )}
          </CardContent>
        </Card>

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
                        <Badge variant="outline">Dùng kênh nền tảng</Badge>
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
      </main>
    </div>
  )
}
