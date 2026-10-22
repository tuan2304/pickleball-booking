'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBooking } from '@/app/actions/booking'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
  Zap,
  Flame,
} from 'lucide-react'

import { MATCH_SKILL_IDS, SKILL_LEVELS, type MatchSkillId } from '@/lib/constants'
import { formatNumber, formatVnd, formatDate } from '@/lib/format'
interface CourtData {
  id: string
  name: string
  sport_type: string
  surface_type: string | null
  base_price_per_hour: number
  deposit_percentage: number
  is_active: boolean
  court_pricing_rules: Array<{
    id: string
    name: string
    start_time: string
    end_time: string
    price_per_hour: number
    days_of_week: number[]
  }>
}

interface ExistingBooking {
  id: string
  court_id: string
  start_time: string
  end_time: string
  status: string
}

interface TimeSlotPickerProps {
  courts: CourtData[]
  existingBookings: ExistingBooking[]
  clubOpenTime: string
  clubCloseTime: string
}

export function TimeSlotPicker({
  courts,
  existingBookings,
  clubOpenTime,
  clubCloseTime,
}: TimeSlotPickerProps) {
  const router = useRouter()

  // 1. Court selection
  const [selectedCourtId, setSelectedCourtId] = useState<string>(
    courts[0]?.id || ''
  )

  // 2. Date selection
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  // 3. Slot selection (startHour & duration in hours)
  const [startHour, setStartHour] = useState<number | null>(null)
  const [duration, setDuration] = useState<number>(1) // 1 hour, 1.5, 2 hours
  const [note, setNote] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // 4. Matchmaking state (Giai đoạn 4)
  const [isOpenMatch, setIsOpenMatch] = useState<boolean>(false)
  const [matchTitle, setMatchTitle] = useState<string>('')
  const [matchDescription] = useState<string>('')
  const [skillLevel, setSkillLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [requiredPlayers, setRequiredPlayers] = useState<number>(4)
  const [costSharingType, setCostSharingType] = useState<'split' | 'host_covers'>('split')
  const [customCostPerPerson] = useState<string>('')

  const selectedCourt = courts.find((c) => c.id === selectedCourtId)

  // Tạo các slot giờ dựa trên open_time và close_time
  const openHour = parseInt(clubOpenTime.slice(0, 2), 10) || 6
  const closeHour = parseInt(clubCloseTime.slice(0, 2), 10) || 23

  const hoursList: number[] = []
  for (let h = openHour; h < closeHour; h++) {
    hoursList.push(h)
  }

  // Kiểm tra giờ nào đã bị đặt
  function isHourBooked(hour: number): boolean {
    if (!selectedCourtId) return false
    return existingBookings.some((b) => {
      if (b.court_id !== selectedCourtId) return false
      if (b.status === 'cancelled') return false

      const bDate = new Date(b.start_time).toISOString().split('T')[0]
      if (bDate !== selectedDate) return false

      const bStartHour = new Date(b.start_time).getHours()
      const bEndHour = new Date(b.end_time).getHours()

      return hour >= bStartHour && hour < bEndHour
    })
  }

  // Tính toán giá tiền
  let pricePerHour = selectedCourt ? Number(selectedCourt.base_price_per_hour) : 0
  let isPeakHour = false

  if (selectedCourt && startHour !== null) {
    const timeStr = `${startHour.toString().padStart(2, '0')}:00:00`
    const dayOfWeek = new Date(selectedDate).getDay()

    for (const rule of selectedCourt.court_pricing_rules || []) {
      if (rule.days_of_week?.includes(dayOfWeek)) {
        if (timeStr >= rule.start_time && timeStr < rule.end_time) {
          pricePerHour = Number(rule.price_per_hour)
          isPeakHour = true
          break
        }
      }
    }
  }

  const totalPrice = Math.round(pricePerHour * duration)
  const depositPercent = selectedCourt?.deposit_percentage || 30
  const depositAmount = Math.round((totalPrice * depositPercent) / 100)

  async function handleBook() {
    if (startHour === null || !selectedCourt) {
      setError('Vui lòng chọn khung giờ muốn đặt')
      return
    }

    setLoading(true)
    setError(null)

    // Tạo ISO string
    const startObj = new Date(`${selectedDate}T${startHour.toString().padStart(2, '0')}:00:00`)
    const endObj = new Date(startObj.getTime() + duration * 60 * 60 * 1000)

    const suggestedCost = Math.round(totalPrice / Math.max(1, requiredPlayers))
    const effectiveCost =
      costSharingType === 'host_covers'
        ? 0
        : customCostPerPerson
        ? Number(customCostPerPerson)
        : suggestedCost

    const result = await createBooking(
      selectedCourt.id,
      startObj.toISOString(),
      endObj.toISOString(),
      note,
      isOpenMatch
        ? {
            isOpenMatch: true,
            title: matchTitle.trim() || `Kèo ${selectedCourt.name} (${selectedDate})`,
            description: matchDescription.trim(),
            skillLevel,
            requiredPlayers,
            costSharingType,
            costPerPerson: effectiveCost,
          }
        : undefined
    )

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.bookingId) {
      router.push(`/bookings/${result.bookingId}`)
    }
  }

  if (courts.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm">
        Cơ sở này hiện chưa có sân con nào hoạt động.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 2 Cols: Slot Picker */}
      <div className="lg:col-span-2 space-y-6">
        {/* Step 1: Chọn Sân Con */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-foreground">1. Chọn sân con</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {courts.map((court) => {
              const isSelected = court.id === selectedCourtId
              return (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => {
                    setSelectedCourtId(court.id)
                    setStartHour(null) // reset slot
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:border-emerald-500/30 hover:text-foreground'
                  }`}
                >
                  <div className="text-sm">{court.name}</div>
                  <div className="text-xs opacity-75 font-normal capitalize">
                    {court.sport_type} • {formatNumber(court.base_price_per_hour)} đ/h
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Chọn Ngày */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-foreground">2. Chọn ngày chơi</Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0])
                  setStartHour(null)
                }}
                className="h-7 text-xs cursor-pointer"
              >
                Hôm nay
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const tmr = new Date()
                  tmr.setDate(tmr.getDate() + 1)
                  setSelectedDate(tmr.toISOString().split('T')[0])
                  setStartHour(null)
                }}
                className="h-7 text-xs cursor-pointer"
              >
                Ngày mai
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card max-w-xs">
            <CalendarDays className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setStartHour(null)
              }}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer w-full"
            />
          </div>
        </div>

        {/* Step 3: Chọn Khung Giờ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-foreground">3. Chọn giờ bắt đầu</Label>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Còn trống
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" /> Đã kín
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {hoursList.map((hour) => {
              const booked = isHourBooked(hour)
              const isSelected = startHour === hour

              return (
                <button
                  key={hour}
                  type="button"
                  disabled={booked}
                  onClick={() => setStartHour(hour)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    booked
                      ? 'bg-muted/40 text-muted-foreground/40 border border-border/40 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-600/30 scale-102 ring-2 ring-emerald-500 ring-offset-2 ring-offset-background'
                      : 'bg-card border border-border text-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer'
                  }`}
                >
                  <span>{hour.toString().padStart(2, '0')}:00</span>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Thời lượng thuê */}
        {startHour !== null && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold text-foreground">Thời lượng chơi</Label>
            <div className="flex items-center gap-2">
              {[1, 1.5, 2, 2.5, 3].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDuration(dur)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    duration === dur
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {dur} tiếng
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1 Col: Summary & Deposit Box */}
      <div className="space-y-4">
        <Card className="border-border shadow-md sticky top-24 bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold">Tóm Tắt Đặt Sân</CardTitle>
            <CardDescription className="text-xs">
              Giữ chỗ tự động 15 phút qua VietQR PayOS
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 pb-3 border-b border-border/60">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sân đã chọn:</span>
                <span className="font-bold text-foreground">{selectedCourt?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày chơi:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(selectedDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Khung giờ:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {startHour !== null
                    ? `${startHour}:00 - ${startHour + duration}:00 (${duration}h)`
                    : 'Chưa chọn giờ'}
                </span>
              </div>
              {isPeakHour && (
                <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded-md font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  Áp dụng giá Giờ Vàng / Cao Điểm
                </div>
              )}
            </div>

            {/* Note */}
            <div className="space-y-1">
              <Label htmlFor="bookingNote" className="text-xs text-muted-foreground">
                Ghi chú cho chủ sân (tùy chọn)
              </Label>
              <Input
                id="bookingNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Cần mượn thêm áo pitch..."
                className="h-8 text-xs"
              />
            </div>

            {/* Matchmaking Option (Giai đoạn 4) */}
            <div className="pt-2 border-t border-border/60">
              <div
                onClick={() => setIsOpenMatch(!isOpenMatch)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                  isOpenMatch
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-300'
                    : 'bg-muted/40 border-border hover:bg-muted/70 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isOpenMatch ? 'bg-amber-400 text-slate-900' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Mở Ghép Kèo Giao Lưu</div>
                    <div className="text-xs text-muted-foreground">Tuyển thêm người chơi chung</div>
                  </div>
                </div>
                <Badge
                  variant={isOpenMatch ? 'default' : 'outline'}
                  className={
                    isOpenMatch
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs'
                      : 'text-xs'
                  }
                >
                  {isOpenMatch ? 'Đang Bật' : 'Bấm để bật'}
                </Badge>
              </div>

              {isOpenMatch && (
                <div className="mt-3 p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">
                      Tiêu đề bài đăng ghép kèo
                    </Label>
                    <Input
                      value={matchTitle}
                      onChange={(e) => setMatchTitle(e.target.value)}
                      placeholder={`Ví dụ: Tuyển ${Math.max(1, requiredPlayers - 1)} bạn giao lưu vui vẻ`}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Tổng số người cần
                      </Label>
                      <select
                        value={requiredPlayers}
                        onChange={(e) => setRequiredPlayers(Number(e.target.value))}
                        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground"
                      >
                        {[2, 3, 4, 6, 8, 10, 12, 14].map((num) => (
                          <option key={num} value={num}>
                            {num} người ({num - 1} slot trống)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Trình độ yêu cầu
                      </Label>
                      <select
                        value={skillLevel}
                        onChange={(e) => setSkillLevel(e.target.value as MatchSkillId)}
                        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground"
                      >
                        {MATCH_SKILL_IDS.map((id) => (
                          <option key={id} value={id}>
                            {SKILL_LEVELS[id].longLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Hình thức chia tiền sân
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCostSharingType('split')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          costSharingType === 'split'
                            ? 'bg-emerald-700 text-white border-emerald-600 shadow-sm'
                            : 'bg-background border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Chia đều tiền
                      </button>
                      <button
                        type="button"
                        onClick={() => setCostSharingType('host_covers')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          costSharingType === 'host_covers'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-background border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Chủ bao trọn (0đ)
                      </button>
                    </div>

                    {costSharingType === 'split' && (
                      <div className="text-xs text-muted-foreground pt-1 flex justify-between items-center">
                        <span>Gợi ý mỗi người đóng:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {formatNumber(Math.round(totalPrice / Math.max(1, requiredPlayers)))} đ/người
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Đơn giá theo giờ:</span>
                <span>{formatNumber(pricePerHour)} đ/h</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-sm">
                <span>Tổng tiền sân:</span>
                <span>{formatVnd(totalPrice)}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="font-semibold">Tiền cọc giữ chỗ ({depositPercent}%):</span>
                <span className="font-extrabold text-base">
                  {formatVnd(depositAmount)}
                </span>
              </div>
            </div>

            <Button
              type="button"
              disabled={startHour === null || loading}
              onClick={handleBook}
              className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md shadow-emerald-600/30 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang giữ chỗ...
                </>
              ) : (
                'Xác Nhận Giữ Chỗ 15 Phút'
              )}
            </Button>

            <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
              Sân được giữ tạm 15 phút chờ quét mã QR PayOS
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
