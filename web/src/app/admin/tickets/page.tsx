import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TicketStatusBadge } from '@/components/support/ticket-status-badge'
import { categoryLabel, isTicketStatus } from '@/lib/support'
import { formatDate, formatTime } from '@/lib/format'

export const metadata = { title: 'Hỗ trợ (ticket)' }

const FILTERS = [
  { id: 'open', label: 'Chờ trả lời' },
  { id: 'answered', label: 'Đã trả lời' },
  { id: 'resolved', label: 'Đã giải quyết' },
  { id: 'closed', label: 'Đã đóng' },
  { id: 'all', label: 'Tất cả' },
] as const

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusParam } = await searchParams
  const filter = isTicketStatus(statusParam) ? statusParam : statusParam === 'all' ? 'all' : 'open'

  let query = createAdminClient()
    .from('support_tickets')
    .select('id, subject, category, status, last_message_at, user:profiles!support_tickets_user_id_fkey(full_name, role), club:clubs(name)')
    .order('last_message_at', { ascending: false })
    .limit(100)
  if (filter !== 'all') query = query.eq('status', filter)
  const { data: tickets } = await query

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Hỗ trợ (ticket)</h1>
        <p className="text-sm text-muted-foreground mt-1">Yêu cầu của chủ sân và người chơi gửi tới quản trị nền tảng.</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/tickets?status=${f.id}`}
            aria-current={f.id === filter ? 'page' : undefined}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border ${
              f.id === filter ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {(tickets ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Không có yêu cầu nào trong mục này.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {(tickets ?? []).map((t) => (
            <li key={t.id}>
              <Link href={`/admin/tickets/${t.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-emerald-600/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{t.subject}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{t.user?.full_name || 'Người dùng'}</span>
                      <Badge variant="outline" className="text-xs py-0">{t.user?.role === 'owner' ? 'Chủ sân' : t.user?.role === 'admin' ? 'Quản trị' : 'Người chơi'}</Badge>
                      <span>· {categoryLabel(t.category)}</span>
                      {t.club?.name && <span>· {t.club.name}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <TicketStatusBadge status={t.status} forAdmin />
                    <div className="text-xs text-muted-foreground">{formatDate(t.last_message_at)} {formatTime(t.last_message_at)}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
