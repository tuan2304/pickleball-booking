import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  CalendarCheck,
  CircleDollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  User,
} from 'lucide-react'

export default async function OwnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Lấy danh sách cụm sân của chủ sân
  const { data: clubs } = await supabase
    .from('clubs')
    .select('*, courts(*)')
    .eq('owner_id', user?.id || '')

  const clubList = clubs || []
  const totalClubs = clubList.length
  const totalCourts = clubList.reduce((acc, club) => acc + (club.courts?.length || 0), 0)

  // 2. Lấy danh sách bookings gần nhất
  const courtIds = clubList.flatMap((c) => c.courts?.map((court: { id: string }) => court.id) || [])

  let bookings: Array<{
    id: string
    start_time: string
    end_time: string
    total_price: number
    deposit_amount: number
    status: string
    court: { name: string; sport_type: string } | null
    profile: { full_name: string; phone_number: string | null } | null
  }> = []

  if (courtIds.length > 0) {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        total_price,
        deposit_amount,
        status,
        court:courts(name, sport_type),
        profile:profiles(full_name, phone_number)
      `)
      .in('court_id', courtIds)
      .order('created_at', { ascending: false })
      .limit(6)

    bookings = (bookingData as unknown as typeof bookings) || []
  }

  const todayBookingsCount = bookings.length
  const totalEstimatedDeposit = bookings.reduce(
    (acc, b) => (b.status === 'confirmed' ? acc + Number(b.deposit_amount) : acc),
    0
  )

  return (
    <div className="space-y-8">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Bảng Điều Khiển Của Bạn
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi tình trạng hoạt động sân, lịch đặt và dòng tiền cọc theo thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/owner/clubs">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm Cụm Sân / Sân Con
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Cụm Sân
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalClubs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Đang hoạt động trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Sân Con
            </CardTitle>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCourts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sẵn sàng cho khách đặt sân
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đơn Đặt Gần Đây
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{todayBookingsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lượt đặt cần theo dõi
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiền Cọc Đã Nhận
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {totalEstimatedDeposit.toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đã xác nhận qua VietQR PayOS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings Section */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Lịch Đặt Sân Mới Nhất</CardTitle>
            <CardDescription className="text-xs">
              Được đồng bộ tức thì khi khách hàng đặt hoặc chuyển cọc thành công
            </CardDescription>
          </div>
          <Link href="/owner/schedule">
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
              Xem toàn bộ lịch <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">Chưa có lượt đặt sân nào</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Hãy bắt đầu bằng cách thêm các cụm sân và sân con để người chơi có thể tìm kiếm và đặt chỗ.
              </p>
              <Link href="/owner/clubs">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  <Plus className="w-4 h-4 mr-1" /> Tạo Cụm Sân Ngay
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((item) => {
                const startTime = new Date(item.start_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const endTime = new Date(item.end_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const dateStr = new Date(item.start_time).toLocaleDateString('vi-VN')

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {item.court?.name || 'Sân tiêu chuẩn'}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{startTime} - {endTime} ({dateStr})</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          item.status === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : item.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {item.status === 'confirmed'
                          ? 'Đã cọc'
                          : item.status === 'pending'
                          ? 'Chờ cọc'
                          : item.status}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{item.profile?.full_name || 'Khách vãng lai'}</span>
                      </div>
                      <div className="font-bold text-foreground">
                        Cọc: {Number(item.deposit_amount).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
