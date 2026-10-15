import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, CalendarCheck, Users, QrCode, ArrowRight, Flame, LogOut, Compass, Calendar } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const isOwner = profile?.role === 'owner'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header Navigation */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-black tracking-tight text-xl">
              SPORT<span className="text-emerald-600">ARENA</span>
            </span>
          </div>

          {/* Nav links (chỉ hiện khi đã đăng nhập) */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/clubs"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Compass className="w-4 h-4 text-emerald-600" />
                Khám Phá Sân
              </Link>
              <Link
                href="/matches"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Flame className="w-4 h-4 text-amber-500" />
                Kèo Giao Lưu
              </Link>
              <Link
                href="/my-bookings"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                Lịch Đặt
              </Link>
            </nav>
          )}

          {/* Auth section */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationBell userId={user.id} />

                <div className="flex items-center gap-2 pl-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-600 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-bold text-foreground truncate max-w-[120px]">
                      {profile?.full_name || 'Người dùng'}
                    </div>
                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-emerald-500/30 text-emerald-600">
                      {isOwner ? 'Chủ sân' : 'Người chơi'}
                    </Badge>
                  </div>
                </div>

                {isOwner && (
                  <Link href="/owner/dashboard">
                    <Button size="sm" variant="outline" className="text-xs font-semibold border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex">
                      Cổng Chủ Sân
                    </Button>
                  </Link>
                )}

                <form action={logout}>
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="text-sm font-semibold cursor-pointer">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 font-semibold cursor-pointer">
                    Đăng ký tài khoản
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 flex-1 flex flex-col justify-center">
        {/* Decorative Gradients */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-xs">
            <Flame className="w-4 h-4 text-emerald-600" />
            Nền tảng Thể thao Real-time Thế hệ Mới
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-foreground">
            Đặt Sân Tự Do, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400">
              Ghép Kèo Tức Thì & Quản Lý Toàn Diện
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Hệ thống đặt sân linh hoạt chống trùng lịch 100%, tự động nhận cọc qua VietQR PayOS và cổng quản trị chuyên sâu dành cho Chủ sân thể thao.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/clubs">
              <Button size="lg" className="w-full sm:w-auto h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/30 text-base cursor-pointer">
                Khám Phá Sân Thể Thao <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/matches">
              <Button size="lg" className="w-full sm:w-auto h-12 px-6 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/30 text-base cursor-pointer">
                <Flame className="w-4 h-4 mr-2" />
                Kèo Giao Lưu
              </Button>
            </Link>
            {/* Nút Cổng Chủ Sân: chỉ hiện nếu là owner hoặc chưa đăng nhập */}
            {(!user || isOwner) && (
              <Link href="/owner/dashboard">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-6 border-border font-semibold text-base cursor-pointer hover:bg-muted">
                  Cổng Chủ Sân
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 border-t border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Lịch Đặt Chống Trùng 100%</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Thuật toán PostgreSQL GiST Exclusion Constraint tự động khóa sân ngay khi có người giữ chỗ, giải phóng sau 15 phút nếu chưa hoàn tất cọc.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Thanh Toán VietQR PayOS</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mã QR ngân hàng tự động sinh ra cho từng đơn cọc, Webhook xác nhận tức thì và cập nhật trạng thái phòng sân theo thời gian thực.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Ghép Kèo Thể Thao Tức Thì</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Người chơi có thể mở ghép kèo ngay khi đặt sân, phân loại trình độ giao lưu và tùy chọn chia đều tiền sân tiện lợi.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 SportArena - Nền tảng Đặt sân & Ghép kèo Thể thao Real-time.</p>
      </footer>
    </div>
  )
}
