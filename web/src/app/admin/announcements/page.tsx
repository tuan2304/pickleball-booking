import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnnouncementForm } from '@/components/admin/announcement-form'
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_KINDS } from '@/lib/support'
import { formatDate, formatTime } from '@/lib/format'

export const metadata = { title: 'Gửi thông báo' }

export default async function AdminAnnouncementsPage() {
  const { data: history } = await createAdminClient()
    .from('announcements')
    .select('id, title, body, kind, audience, sent_count, sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold">Gửi thông báo cập nhật</h1>
        <p className="text-sm text-muted-foreground mt-1">Thông báo hiện trong chuông của từng người dùng, cập nhật ngay không cần tải lại trang.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Soạn thông báo</CardTitle>
          <CardDescription>Dùng cho cập nhật tính năng, lịch bảo trì hoặc thông tin chung.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đã gửi gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa gửi thông báo nào.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(history ?? []).map((a) => (
                <li key={a.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.title}</span>
                    <Badge variant="outline" className="text-xs">{ANNOUNCEMENT_KINDS.find((k) => k.id === a.kind)?.label ?? a.kind}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                  <div className="text-xs text-muted-foreground">
                    {ANNOUNCEMENT_AUDIENCES.find((x) => x.id === a.audience)?.label} · {a.sent_count} người nhận · {formatDate(a.sent_at ?? a.created_at)} {formatTime(a.sent_at ?? a.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
