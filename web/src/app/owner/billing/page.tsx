import { getSupabase, getCurrentUser } from '@/lib/supabase/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SubscriptionCheckoutPanel } from '@/components/owner/subscription-checkout'
import {
  courtLimit,
  FREE_COURT_LIMIT,
  getBillingStart,
  getProMonthlyPrice,
  isBillingEnforced,
  isProActive,
  SUBSCRIPTION_MONTH_OPTIONS,
  subscriptionPrice,
} from '@/lib/billing'
import { formatDate, formatVnd } from '@/lib/format'
import { Crown } from 'lucide-react'

export const metadata = { title: 'Gói dịch vụ' }

export default async function OwnerBillingPage() {
  const supabase = await getSupabase()
  const user = await getCurrentUser()

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, plan, plan_until, courts:courts(id, is_active)')
    .eq('owner_id', user?.id ?? '')
    .order('created_at', { ascending: true })

   
  const now = new Date()
  const start = getBillingStart()
  const enforced = isBillingEnforced(now, start)
  const monthly = getProMonthlyPrice()
  const options = SUBSCRIPTION_MONTH_OPTIONS.map((months) => ({ months, price: subscriptionPrice(months, monthly) }))

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Crown className="w-7 h-7 text-amber-600 dark:text-amber-400" aria-hidden />
          Gói dịch vụ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gói <strong>Free</strong> tối đa {FREE_COURT_LIMIT} sân con đang hoạt động; gói <strong>Pro</strong> không giới hạn số sân.
        </p>
      </div>

      <div
        className={`p-4 rounded-xl border text-sm ${
          enforced
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        {enforced
          ? `Giới hạn gói Free đang được áp dụng. Giá gói Pro: ${formatVnd(monthly)}/tháng.`
          : start
          ? `Hiện bạn dùng miễn phí không giới hạn. Việc giới hạn gói Free bắt đầu từ ${formatDate(start)}.`
          : 'Hiện bạn dùng miễn phí không giới hạn trong giai đoạn đầu. Sẽ có thông báo trước khi bắt đầu thu phí.'}
      </div>

      {(clubs ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Bạn chưa có cụm sân nào.</CardContent>
        </Card>
      ) : (
        (clubs ?? []).map((club) => {
          const activeCourts = (club.courts ?? []).filter((c) => c.is_active).length
          const pro = isProActive(club.plan, club.plan_until, now)
          const limit = courtLimit({ plan: club.plan, planUntil: club.plan_until, now, enforced })
          const over = Number.isFinite(limit) && activeCourts > limit
          return (
            <Card key={club.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  {pro ? (
                    <Badge className="bg-amber-400 text-slate-900 gap-1">
                      <Crown className="w-3.5 h-3.5" aria-hidden /> Pro đến {formatDate(club.plan_until!)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Free</Badge>
                  )}
                </div>
                <CardDescription>
                  Sân con đang hoạt động: <strong>{activeCourts}</strong>
                  {Number.isFinite(limit) ? ` / ${limit}` : ' (không giới hạn)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {over && (
                  <p role="status" className="text-xs p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400">
                    Cụm sân đang vượt giới hạn gói Free: chỉ {limit} sân tạo sớm nhất nhận đặt, các sân còn lại tạm ngưng nhận đặt
                    cho đến khi bạn nâng cấp.
                  </p>
                )}
                <div>
                  <h3 className="text-sm font-bold mb-2">{pro ? 'Gia hạn gói Pro' : 'Nâng cấp lên Pro'}</h3>
                  <SubscriptionCheckoutPanel clubId={club.id} options={options} />
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
