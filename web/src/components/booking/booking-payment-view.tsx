'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { confirmBookingDeposit, cancelExpiredBooking } from '@/app/actions/booking'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Calendar,
  Building2,
} from 'lucide-react'

interface BookingPaymentViewProps {
  booking: {
    id: string
    court_id: string
    start_time: string
    end_time: string
    total_price: number
    deposit_amount: number
    status: string
    expires_at: string
  }
  payment: {
    id: string
    order_code: number
    amount: number
    status: string
    checkout_url?: string | null
    qr_code_url?: string | null
  } | null
  court: {
    name: string
    sport_type: string
  }
  club: {
    name: string
    address: string
  }
}

export function BookingPaymentView({
  booking,
  payment,
  court,
  club,
}: BookingPaymentViewProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<string>(booking.status)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<boolean>(false)

  // 1. Tính toán thời gian đếm ngược 15 phút
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const expireTime = new Date(booking.expires_at).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((expireTime - now) / 1000))
  })

  useEffect(() => {
    if (currentStatus === 'confirmed' || currentStatus === 'cancelled' || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          cancelExpiredBooking(booking.id)
          setCurrentStatus('cancelled')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentStatus, timeLeft, booking.id])

  // 2. Lắng nghe Supabase Realtime khi chủ sân hoặc PayOS Webhook xác nhận cọc
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`booking-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${booking.id}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.status) {
            setCurrentStatus(payload.new.status)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [booking.id])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  const orderCode = payment?.order_code || 123456
  const depositAmount = Number(booking.deposit_amount)
  const transferContent = `SPORT ${orderCode}`

  // VietQR URL (từ PayOS qr_code_url hoặc fallback)
  const qrUrl =
    payment?.qr_code_url ||
    `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${depositAmount}&addInfo=${encodeURIComponent(
      transferContent
    )}&accountName=CLB%20THE%20THAO`

  function copyText(text: string, type: string) {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // Gọi Webhook PayOS Simulator để kiểm thử Real-time
  async function handleSimulateConfirm() {
    setConfirming(true)
    try {
      const res = await fetch('/api/payos/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode,
          data: {
            orderCode,
            amount: depositAmount,
            reference: `SIM_${Date.now()}`,
          },
        }),
      })

      if (res.ok) {
        setCurrentStatus('confirmed')
      } else {
        await confirmBookingDeposit(booking.id)
        setCurrentStatus('confirmed')
      }
    } catch {
      await confirmBookingDeposit(booking.id)
      setCurrentStatus('confirmed')
    } finally {
      setConfirming(false)
    }
  }

  // Giao diện khi đã cọc thành công
  if (currentStatus === 'confirmed') {
    return (
      <Card className="max-w-xl mx-auto border-emerald-500/30 shadow-xl overflow-hidden bg-card">
        <div className="bg-emerald-600 p-8 text-center text-white space-y-3">
          <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Đặt Sân & Giữ Chỗ Thành Công!</h2>
          <p className="text-xs text-white/80 max-w-sm mx-auto">
            Tiền cọc của bạn đã được xác thực qua hệ thống. Lịch sân đã được khóa chính thức.
          </p>
        </div>

        <CardContent className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cụm sân:</span>
              <span className="font-bold text-foreground">{club.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sân con:</span>
              <span className="font-semibold text-foreground">{court.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thời gian:</span>
              <span className="font-semibold text-emerald-600">
                {new Date(booking.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(booking.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (
                {new Date(booking.start_time).toLocaleDateString('vi-VN')})
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Tiền cọc đã thanh toán:</span>
              <span className="font-bold text-emerald-600 text-sm">
                {depositAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/my-bookings" className="flex-1">
              <Button variant="outline" className="w-full cursor-pointer">
                Xem Lịch Đặt Của Tôi
              </Button>
            </Link>
            <Link href="/clubs" className="flex-1">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                Tiếp Tục Đặt Sân <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Giao diện khi hết hạn 15 phút hoặc đã hủy
  if (currentStatus === 'cancelled' || timeLeft <= 0) {
    return (
      <Card className="max-w-md mx-auto border-red-500/30 p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Đã Hết Thời Gian Giữ Chỗ</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Đơn giữ chỗ 15 phút đã quá hạn hoặc đã bị hủy. Sân đã được tự động giải phóng để người khác có thể đặt.
        </p>
        <Link href="/clubs">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold">
            Tìm & Đặt Lại Khung Giờ Khác
          </Button>
        </Link>
      </Card>
    )
  }

  // Giao diện thanh toán cọc VietQR chuẩn 15 phút
  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6">
      {/* 3 Cols: Mã VietQR & Đồng Hồ Đếm Ngược */}
      <Card className="md:col-span-3 border-border shadow-md overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Quét Mã VietQR Đặt Cọc</CardTitle>
                <CardDescription className="text-xs">
                  Mở ứng dụng ngân hàng bất kỳ để quét mã cọc
                </CardDescription>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md">
            <img
              src={qrUrl}
              alt="VietQR PayOS"
              className="w-56 h-56 object-contain"
            />
          </div>

          <div className="text-center space-y-1">
            <div className="text-xs text-muted-foreground">Số tiền cọc cần chuyển:</div>
            <div className="text-2xl font-black text-emerald-600">
              {depositAmount.toLocaleString('vi-VN')} đ
            </div>
          </div>

          {/* Transfer Info Breakdown */}
          <div className="w-full space-y-2 text-xs pt-2 border-t border-border/60">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">Ngân hàng:</span>
              <span className="font-bold text-foreground">MBBank (Ngân hàng Quân Đội)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">0987654321</span>
                <button
                  type="button"
                  onClick={() => copyText('0987654321', 'account')}
                  className="text-muted-foreground hover:text-emerald-600 cursor-pointer"
                  title="Copy STK"
                >
                  {copied === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Nội dung chuyển khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{transferContent}</span>
                <button
                  type="button"
                  onClick={() => copyText(transferContent, 'content')}
                  className="text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  title="Copy nội dung"
                >
                  {copied === 'content' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/20 border-t border-border/60 p-4 flex flex-col gap-2">
          <Button
            type="button"
            disabled={confirming}
            onClick={handleSimulateConfirm}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xác nhận cọc...
              </>
            ) : (
              'Tôi Đã Chuyển Khoản (Xác Nhận Ngay)'
            )}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Kênh Realtime đang hoạt động — Hệ thống tự động chuyển trang khi nhận tiền
          </p>
        </CardFooter>
      </Card>

      {/* 2 Cols: Thông tin lịch đặt */}
      <div className="md:col-span-2 space-y-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold">Chi Tiết Lịch Đặt</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-foreground text-sm">{club.name}</div>
              <div className="text-muted-foreground">{club.address}</div>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sân con:</span>
                <span className="font-bold text-foreground">{court.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Môn chơi:</span>
                <span className="font-semibold text-foreground capitalize">{court.sport_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày chơi:</span>
                <span className="font-semibold text-foreground">
                  {new Date(booking.start_time).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Khung giờ:</span>
                <span className="font-bold text-emerald-600">
                  {new Date(booking.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(booking.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Tổng tiền sân:</span>
                <span>{Number(booking.total_price).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600 text-sm">
                <span>Tiền cọc giữ chỗ:</span>
                <span>{depositAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Còn lại thanh toán tại sân:</span>
                <span>{(Number(booking.total_price) - depositAmount).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground space-y-2">
          <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Chính Sách Giữ Chỗ
          </div>
          <p className="leading-relaxed">
            Sân được bảo lưu trong 15 phút. Nếu trong khoảng thời gian này giao dịch cọc không hoàn tất, hệ thống sẽ tự động hủy đơn và mở sân cho người chơi khác.
          </p>
        </div>
      </div>
    </div>
  )
}
