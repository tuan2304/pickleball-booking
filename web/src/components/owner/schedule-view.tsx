'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateBookingStatus } from '@/app/actions/owner'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'

import { formatVnd, formatTime, formatDate } from '@/lib/format'
import { addDaysToDateKey, vnDateKey } from '@/lib/datetime'
import { vnHourSpan } from '@/lib/booking-slots'
interface ScheduleCourt {
  id: string
  name: string
  club_name: string
  sport_type: string
}

interface ScheduleBooking {
  id: string
  court_id: string
  start_time: string
  end_time: string
  total_price: number
  deposit_amount: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  user_name: string
  user_phone: string
  court_name: string
}

interface ScheduleViewProps {
  courts: ScheduleCourt[]
  initialBookings: ScheduleBooking[]
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

export function ScheduleView({ courts, initialBookings }: ScheduleViewProps) {
  const router = useRouter()
  const askConfirm = useConfirm()
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline')
  // Ngày theo giờ Việt Nam (toISOString() trả ngày UTC nên sai trước 7h sáng)
  const [selectedDate, setSelectedDate] = useState<string>(() => vnDateKey(Date.now()))
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  // Đăng ký Supabase Realtime để đồng bộ tức thì
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Thay đổi ngày
  function changeDate(days: number) {
    setSelectedDate(addDaysToDateKey(selectedDate, days))
  }

  // Lọc bookings theo ngày được chọn
  const dayBookings = initialBookings.filter((b) => {
    return vnDateKey(new Date(b.start_time)) === selectedDate
  })

  // Lọc theo trạng thái cho chế độ xem bảng
  const filteredTableBookings = dayBookings.filter((b) => {
    if (statusFilter === 'all') return true
    return b.status === statusFilter
  })

  async function handleStatusChange(bookingId: string, status: 'confirmed' | 'cancelled' | 'completed') {
    if (status === 'cancelled') {
      const ok = await askConfirm({
        title: 'Hủy đơn đặt sân này?',
        description: 'Khách sẽ nhận thông báo. Nếu khách đã cọc, bạn phải hoàn đủ tiền cọc cho khách (xem mục Hoàn cọc).',
        confirmText: 'Hủy đơn',
        cancelText: 'Giữ lại',
        destructive: true,
      })
      if (!ok) return
    }

    setUpdatingId(bookingId)
    const result = await updateBookingStatus(bookingId, status)
    setUpdatingId(null)

    if (result.error) {
      toast.error(result.error)
      return
    }
    if (status === 'cancelled' && result.refundAmount) {
      toast.success(`Đã hủy đơn. Bạn cần hoàn ${formatVnd(result.refundAmount)} cho khách tại mục Hoàn cọc.`)
    } else if (status === 'cancelled') {
      toast.success('Đã hủy đơn đặt sân.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeDate(-1)}
            aria-label="Ngày trước"
            className="h-9 w-9 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30">
            <CalendarDays className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => changeDate(1)}
            aria-label="Ngày sau"
            className="h-9 w-9 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(vnDateKey(Date.now()))}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
          >
            Hôm nay
          </Button>
        </div>

        {/* View Switcher Toggle & Realtime Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isLive ? 'Realtime Live' : 'Đang kết nối...'}</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border/60 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-background text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Lưới Thời Gian (Timeline)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-background text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Bảng Dữ Liệu (Table)
            </button>
          </div>
        </div>
      </div>

      {courts.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center text-muted-foreground">
          Chưa có sân con nào được tạo. Hãy vào mục &quot;Cụm sân &amp; Sân con&quot; để thêm sân trước.
        </Card>
      ) : viewMode === 'timeline' ? (
        /* ========================================================
         * 1. TIMELINE GRID VIEW (Mỗi sân con 1 cột, slot giờ theo hàng)
         * ======================================================== */
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Lưới Lịch Chi Tiết Theo Sân</CardTitle>
                <CardDescription className="text-xs">
                  Hiển thị khung giờ từ 06:00 đến 23:00 ngày {formatDate(selectedDate)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Đã cọc
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Chờ cọc
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  Sân trống
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row: Danh sách sân */}
              <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] border-b border-border bg-muted/40 sticky top-0 z-10">
                <div className="p-3 text-xs font-bold text-muted-foreground text-center border-r border-border">
                  Khung giờ
                </div>
                {courts.map((court) => (
                  <div
                    key={court.id}
                    className="p-3 text-xs font-bold text-foreground border-r border-border last:border-r-0 text-center"
                  >
                    <div className="truncate">{court.name}</div>
                    <div className="text-xs text-muted-foreground font-normal truncate">
                      {court.club_name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time rows */}
              {TIME_SLOTS.map((slot) => {
                const slotHour = parseInt(slot.split(':')[0], 10)

                return (
                  <div
                    key={slot}
                    className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] border-b border-border/40 hover:bg-muted/10 transition-colors"
                  >
                    {/* Giờ */}
                    <div className="p-2.5 text-xs text-muted-foreground font-medium text-center border-r border-border flex items-center justify-center bg-muted/20">
                      {slot}
                    </div>

                    {/* Từng sân con */}
                    {courts.map((court) => {
                      // Tìm booking trùng với giờ này
                      const booking = dayBookings.find((b) => {
                        if (b.court_id !== court.id) return false
                        const { startHour, endHour } = vnHourSpan(b.start_time, b.end_time)
                        return slotHour >= startHour && slotHour < endHour
                      })

                      const isFirstHour =
                        booking && vnHourSpan(booking.start_time, booking.end_time).startHour === slotHour

                      return (
                        <div
                          key={court.id}
                          className="p-1 border-r border-border/40 last:border-r-0 min-h-[48px] flex items-center justify-center relative"
                        >
                          {booking ? (
                            isFirstHour ? (
                              <div
                                className={`w-full h-full rounded-lg p-2 text-xs flex flex-col justify-between shadow-xs border ${
                                  booking.status === 'confirmed'
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                                    : booking.status === 'pending'
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                                    : 'bg-muted border-border text-muted-foreground'
                                }`}
                              >
                                <div className="font-bold truncate">
                                  {booking.user_name || 'Khách đặt'}
                                </div>
                                <div className="text-xs flex items-center justify-between opacity-80 mt-0.5">
                                  <span>{booking.user_phone}</span>
                                  <span className="font-semibold">
                                    {booking.status === 'confirmed' ? 'Đã cọc' : 'Chờ cọc'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`w-full h-full rounded-md opacity-40 ${
                                  booking.status === 'confirmed'
                                    ? 'bg-emerald-500/20'
                                    : 'bg-amber-500/20'
                                }`}
                              />
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground/30 font-mono">
                              Trống
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ========================================================
         * 2. DATA TABLE VIEW (Bộ lọc & Danh sách chi tiết)
         * ======================================================== */
        <Card className="border-border shadow-sm">
          <CardHeader className="py-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Danh Sách Đơn Đặt Sân</CardTitle>
                <CardDescription className="text-xs">
                  Tổng hợp các lịch đặt ngày {formatDate(selectedDate)}
                </CardDescription>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                {['all', 'confirmed', 'pending', 'completed'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer capitalize ${
                      statusFilter === status
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {status === 'all'
                      ? 'Tất cả'
                      : status === 'confirmed'
                      ? 'Đã cọc'
                      : status === 'pending'
                      ? 'Chờ cọc'
                      : 'Hoàn tất'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredTableBookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Không tìm thấy đơn đặt sân nào phù hợp với bộ lọc trong ngày này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-xs border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Sân con</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Khung giờ</th>
                      <th className="py-3 px-4">Tổng tiền</th>
                      <th className="py-3 px-4">Tiền cọc</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTableBookings.map((b) => {
                      const startTime = formatTime(b.start_time)
                      const endTime = formatTime(b.end_time)

                      const isUpdating = updatingId === b.id

                      return (
                        <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">
                            {b.court_name}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{b.user_name}</div>
                            <div className="text-xs text-muted-foreground">{b.user_phone}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                              {startTime} - {endTime}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {formatVnd(b.total_price)}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                            {formatVnd(b.deposit_amount)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                b.status === 'confirmed'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                  : b.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-muted text-muted-foreground'
                              }
                            >
                              {b.status === 'confirmed'
                                ? 'Đã cọc'
                                : b.status === 'pending'
                                ? 'Chờ cọc'
                                : b.status === 'completed'
                                ? 'Hoàn tất'
                                : 'Đã hủy'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin ml-auto text-emerald-700 dark:text-emerald-400" />
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {b.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange(b.id, 'confirmed')}
                                    className="h-7 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Duyệt Cọc
                                  </Button>
                                )}
                                {b.status === 'confirmed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange(b.id, 'completed')}
                                    className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                  >
                                    Hoàn Tất
                                  </Button>
                                )}
                                {b.status !== 'cancelled' && b.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(b.id, 'cancelled')}
                                    className="h-7 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Hủy
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
