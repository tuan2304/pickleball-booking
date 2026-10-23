import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformStats, parsePeriod, percent, PERIOD_OPTIONS } from '@/lib/admin-stats'
import { formatNumber, formatVnd } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart } from '@/components/admin/bar-chart'
import { AlertTriangle } from 'lucide-react'

export const metadata = { title: 'Thống kê vận hành' }

function dayLabel(day: string) {
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

function Kpi({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`text-2xl font-extrabold tabular-nums ${accent ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams
  const days = parsePeriod(daysParam)
  const stats = await getPlatformStats(createAdminClient(), days)

  const confirmedRate = percent(stats.bookings.confirmed, stats.bookings.created)
  const cancelRate = percent(stats.bookings.cancelled, stats.bookings.created)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Thống kê vận hành</h1>
          <p className="text-sm text-muted-foreground mt-1">Số liệu theo giờ Việt Nam, tính trong {days} ngày gần nhất.</p>
        </div>
        <nav className="inline-flex rounded-xl border border-border bg-card p-1" aria-label="Khoảng thời gian">
          {PERIOD_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/admin?days=${d}`}
              aria-current={d === days ? 'page' : undefined}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${
                d === days ? 'bg-emerald-700 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d} ngày
            </Link>
          ))}
        </nav>
      </div>

      {stats.open_tickets > 0 && (
        <Link href="/admin/tickets" className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm hover:bg-amber-500/15">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
          <span><b>{stats.open_tickets}</b> yêu cầu hỗ trợ đang chờ trả lời</span>
        </Link>
      )}

      <section aria-labelledby="sec-revenue" className="space-y-3">
        <h2 id="sec-revenue" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Doanh thu nền tảng</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Doanh thu thuê gói Pro" value={formatVnd(stats.subscriptions.revenue)} hint={`${formatNumber(stats.subscriptions.count)} lượt thanh toán`} accent />
          <Kpi label="Giá trị đặt sân (GMV)" value={formatVnd(stats.bookings.gmv)} hint="Đơn đã xác nhận, không phải doanh thu của bạn" />
          <Kpi label="Cọc khách đã trả" value={formatVnd(stats.deposits.collected)} hint="Về thẳng tài khoản chủ sân, không qua nền tảng" />
          <Kpi label="Cụm sân đang dùng gói Pro" value={formatNumber(stats.clubs.pro)} hint={`Trên tổng ${formatNumber(stats.clubs.total)} cụm sân`} />
        </div>
      </section>

      <section aria-labelledby="sec-ops" className="space-y-3">
        <h2 id="sec-ops" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Vận hành</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Lượt đặt sân" value={formatNumber(stats.bookings.created)} hint={`${confirmedRate}% xác nhận · ${cancelRate}% huỷ · ${stats.bookings.pending} đang chờ cọc`} />
          <Kpi label="Người dùng" value={formatNumber(stats.users.total)} hint={`+${stats.users.new} mới · ${stats.users.owners} chủ sân · ${stats.users.players} người chơi`} />
          <Kpi label="Cụm sân" value={formatNumber(stats.clubs.total)} hint={`+${stats.clubs.new} mới · ${stats.clubs.pro} Pro · ${stats.clubs.own_payos} có PayOS riêng`} />
          <Kpi label="Sân đang hoạt động" value={formatNumber(stats.courts_active)} hint={`${stats.matches.created} kèo mới · ${stats.matches.open} kèo đang mở`} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lượt đặt sân theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart title="Số lượt đặt" data={stats.daily.map((d) => ({ label: dayLabel(d.day), value: Number(d.bookings) }))} format={formatNumber} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cọc thu được theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart title="Tiền cọc" data={stats.daily.map((d) => ({ label: dayLabel(d.day), value: Number(d.deposits) }))} format={formatVnd} barClassName="bg-amber-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cụm sân nổi bật</CardTitle>
          <CardDescription>Top 5 theo số đơn đã xác nhận trong {days} ngày.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.top_clubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn nào được xác nhận trong khoảng này.</p>
          ) : (
            <ol className="divide-y divide-border">
              {stats.top_clubs.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-semibold truncate">{c.name}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <b>{formatNumber(c.bookings)}</b> đơn · <span className="text-muted-foreground">{formatVnd(c.gmv)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
