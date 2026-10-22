import { getSupabase, getCurrentUser } from '@/lib/supabase/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentSettingsForm } from '@/components/owner/payment-settings-form'
import { isPayOSConfigured } from '@/lib/payos'
import { formatVnd } from '@/lib/format'
import { resolveAppUrl } from '@/lib/app-url'
import { Wallet, Landmark } from 'lucide-react'

export const metadata = { title: 'Nhận thanh toán' }

export default async function OwnerPaymentsPage() {
  const supabase = await getSupabase()
  const user = await getCurrentUser()

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('owner_id', user?.id ?? '')
    .order('created_at', { ascending: true })
  const clubList = clubs ?? []
  const clubIds = clubList.map((c) => c.id)

  // Khóa chỉ đọc được bằng service_role; ở đây chỉ lấy phần không bí mật (Client ID, thời điểm xác thực)
  const admin = createAdminClient()
  const [{ data: settings }, { data: balances }] = await Promise.all([
    clubIds.length
      ? admin.from('club_payment_settings').select('club_id, payos_client_id, verified_at').in('club_id', clubIds)
      : Promise.resolve({ data: [] }),
    clubIds.length ? admin.rpc('club_balances', { p_club_ids: clubIds }) : Promise.resolve({ data: [] }),
  ])
  const settingsByClub = new Map((settings ?? []).map((s) => [s.club_id, s]))
  const balanceByClub = new Map((balances ?? []).map((b) => [b.club_id, b]))
  const platformHolds = isPayOSConfigured()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Wallet className="w-7 h-7 text-emerald-700 dark:text-emerald-400" aria-hidden />
          Nhận thanh toán
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kết nối kênh PayOS của bạn để tiền cọc của khách chuyển <strong>thẳng vào tài khoản ngân hàng của bạn</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cách lấy khóa PayOS</CardTitle>
          <CardDescription>Làm một lần cho mỗi cụm sân (hoặc dùng chung một kênh nếu bạn muốn).</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Đăng ký tại <a href="https://my.payos.vn" target="_blank" rel="noreferrer" className="underline text-emerald-700 dark:text-emerald-400">my.payos.vn</a>,
              tạo một <strong>Kênh thanh toán</strong> và liên kết tài khoản ngân hàng nhận tiền.
            </li>
            <li>Trong kênh vừa tạo, sao chép <strong>Client ID</strong>, <strong>API Key</strong> và <strong>Checksum Key</strong>.</li>
            <li>
              Dán vào ô bên dưới rồi bấm <strong>Lưu &amp; kết nối</strong>. Hệ thống tự đăng ký webhook
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">{resolveAppUrl()}/api/payos/webhook</code>
              cho kênh của bạn và kiểm tra khóa.
            </li>
          </ol>
        </CardContent>
      </Card>

      {clubList.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Bạn chưa có cụm sân nào. Hãy tạo cụm sân ở mục &quot;Cụm sân &amp; Sân con&quot; trước.
          </CardContent>
        </Card>
      ) : (
        clubList.map((club) => {
          const s = settingsByClub.get(club.id)
          const b = balanceByClub.get(club.id)
          return (
            <Card key={club.id}>
              <CardHeader>
                <CardTitle className="text-lg">{club.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <PaymentSettingsForm
                  clubId={club.id}
                  clubName={club.name}
                  connected={Boolean(s?.verified_at)}
                  clientId={s?.payos_client_id ?? null}
                  verifiedAt={s?.verified_at ?? null}
                />

                {!s?.verified_at && platformHolds && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
                    <Landmark className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                    <span>
                      Khi chưa kết nối, tiền cọc về kênh của nền tảng và nền tảng sẽ chuyển lại cho bạn theo từng đợt.
                      Kết nối PayOS riêng để nhận tiền ngay.
                    </span>
                  </div>
                )}

                {b && Number(b.collected) > 0 && (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Nền tảng đã thu hộ</div>
                      <div className="font-bold text-foreground">{formatVnd(b.collected)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Đã chuyển cho bạn</div>
                      <div className="font-bold text-foreground">{formatVnd(b.paid_out)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/10">
                      <div className="text-xs text-muted-foreground">Còn chờ chuyển</div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{formatVnd(b.owed)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
