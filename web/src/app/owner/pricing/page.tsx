import { getSupabase, getCurrentUser } from '@/lib/supabase/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PricingRuleModal } from '@/components/owner/pricing-rule-modal'
import { PricingRuleActions } from '@/components/owner/pricing-rule-actions'
import { Tags, Clock, CircleDollarSign } from 'lucide-react'

import { formatNumber, formatVnd } from '@/lib/format'
export default async function OwnerPricingPage() {
  const supabase = await getSupabase()
  const user = await getCurrentUser()

  // 1. Lấy tất cả sân con của các cụm sân mà user sở hữu
  const { data: clubs } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      courts (
        id,
        name,
        sport_type,
        base_price_per_hour,
        court_pricing_rules (*)
      )
    `)
    .eq('owner_id', user?.id || '')

  const courtOptions: Array<{ id: string; name: string; club_name: string }> = []
  const rulesList: Array<{
    id: string
    name: string
    court_name: string
    club_name: string
    start_time: string
    end_time: string
    price_per_hour: number
    base_price: number
  }> = []

  clubs?.forEach((club) => {
    club.courts?.forEach((court) => {
      courtOptions.push({
        id: court.id,
        name: court.name,
        club_name: club.name,
      })

      court.court_pricing_rules?.forEach((rule) => {
        rulesList.push({
          id: rule.id,
          name: rule.name,
          court_name: court.name,
          club_name: club.name,
          start_time: rule.start_time,
          end_time: rule.end_time,
          price_per_hour: Number(rule.price_per_hour),
          base_price: Number(court.base_price_per_hour),
        })
      })
    })
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Bảng Giá Linh Hoạt Theo Khung Giờ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tự động áp dụng giá theo giờ vàng, cao điểm và ngày cuối tuần khi khách đặt chỗ.
          </p>
        </div>
        {courtOptions.length > 0 && <PricingRuleModal courts={courtOptions} />}
      </div>

      {courtOptions.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center text-muted-foreground">
          Bạn cần tạo Cụm sân và Sân con trước khi có thể cấu hình bảng giá.
        </Card>
      ) : rulesList.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center space-y-3">
          <Tags className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-base font-bold text-foreground">Chưa có khung giá linh hoạt nào</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Hiện tại các sân con đang áp dụng đơn giá cơ bản cố định. Hãy thêm các khung giờ vàng để tối ưu doanh thu cho cơ sở của bạn!
          </p>
          <div className="pt-2">
            <PricingRuleModal courts={courtOptions} />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rulesList.map((rule) => {
            const diff = rule.price_per_hour - rule.base_price

            return (
              <Card key={rule.id} className="border-border shadow-sm hover:border-emerald-500/30 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {rule.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {rule.club_name} • <strong>{rule.court_name}</strong>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                        Áp dụng
                      </Badge>
                      <PricingRuleActions ruleId={rule.id} ruleName={rule.name} />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      Khung giờ:
                    </span>
                    <span className="font-bold text-foreground">
                      {rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CircleDollarSign className="w-3.5 h-3.5" />
                      Giá khung giờ:
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatNumber(rule.price_per_hour)} đ/h
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>Giá cơ bản: {formatVnd(rule.base_price)}</span>
                    <span className={diff >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400'}>
                      {diff >= 0 ? `+${formatVnd(diff)}` : `${formatVnd(diff)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
