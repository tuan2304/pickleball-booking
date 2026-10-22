import type { CSSProperties } from 'react'
import Link from 'next/link'
import { getSupabase, getCurrentUser } from '@/lib/supabase/session'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarCheck, Users, QrCode, ArrowRight, Flame, LogOut, Compass, Calendar } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { NotificationBell } from '@/components/notifications/notification-bell'

import { SPORT_IDS } from '@/lib/constants'
import { SportIcon } from '@/components/ui/sport-icon'
import { Logo } from '@/components/brand/logo'
const FEATURES = [
  {
    icon: CalendarCheck,
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    title: 'Lịch đặt không bao giờ trùng',
    desc: 'Hệ thống khóa khung giờ ngay khi có người giữ chỗ và tự nhả sau 15 phút nếu chưa cọc.',
  },
  {
    icon: QrCode,
    tone: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
    title: 'Cọc nhanh bằng VietQR',
    desc: 'Mỗi đơn có một mã QR riêng. Chuyển khoản xong, trạng thái cập nhật tức thì, không cần tải lại trang.',
  },
  {
    icon: Users,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    title: 'Ghép kèo, chia tiền sân',
    desc: 'Mở kèo ngay lúc đặt sân, chọn trình độ, chia đều tiền hoặc bao trọn. Chủ kèo duyệt từng người.',
  },
]

const STEPS = [
  { n: '01', t: 'Chọn sân', d: 'Lọc theo môn và khu vực, xem giá theo khung giờ.' },
  { n: '02', t: 'Chọn giờ', d: 'Bấm các ô trống trên lịch, hệ thống tự tính giá và tiền cọc.' },
  { n: '03', t: 'Quét QR cọc', d: 'Có 15 phút để chuyển khoản, đồng hồ đếm ngược ngay trên màn hình.' },
  { n: '04', t: 'Rủ bạn chơi', d: 'Mở kèo, duyệt người tham gia và trò chuyện trực tiếp.' },
]

export default async function Home() {
  const supabase = await getSupabase()
  const user = await getCurrentUser()

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
          <Logo size={40} />

          {/* Nav links (chỉ hiện khi đã đăng nhập) */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/clubs"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Compass className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
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
                <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400" />
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
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-bold text-foreground truncate max-w-[120px]">
                      {profile?.full_name || 'Người dùng'}
                    </div>
                    <Badge variant="outline" className="text-xs py-0 px-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      {isOwner ? 'Chủ sân' : 'Người chơi'}
                    </Badge>
                  </div>
                </div>

                {isOwner && (
                  <Link href="/owner/dashboard">
                    <Button size="sm" variant="outline" className="text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex">
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
                  aria-label="Đăng xuất"
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
                  <Button className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20 font-semibold cursor-pointer">
                    Đăng ký tài khoản
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 flex-1 flex flex-col justify-center">
        {/* Nền: lưới mờ + các đốm sáng trôi chậm */}
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute top-10 left-[12%] w-[420px] h-[420px] bg-emerald-500/20 rounded-full blur-[110px] pointer-events-none animate-float" />
        <div className="absolute bottom-0 right-[8%] w-[360px] h-[360px] bg-amber-400/20 rounded-full blur-[110px] pointer-events-none animate-float-slow" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-xs animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            Đặt sân &amp; ghép kèo theo thời gian thực
          </div>

          <h1
            className="text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[0.95] text-foreground animate-fade-up stagger"
            style={{ '--i': 1 } as CSSProperties}
          >
            Đặt sân thật nhanh,
            <br />
            <span className="text-gradient-brand">ra sân thật vui.</span>
          </h1>

          <p
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up stagger"
            style={{ '--i': 2 } as CSSProperties}
          >
            Chọn giờ tự do, không lo trùng lịch. Cọc bằng mã VietQR, rủ thêm người chơi vào kèo
            và nhận thông báo ngay khi có người xin tham gia.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 animate-fade-up stagger"
            style={{ '--i': 3 } as CSSProperties}
          >
            <Link href="/clubs">
              <Button size="lg" className="btn-shine w-full sm:w-auto h-12 px-7 bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-lg shadow-emerald-600/30 text-base cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/40">
                Khám phá sân thể thao <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/matches">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-7 font-bold text-base cursor-pointer border-2 border-amber-500/60 text-amber-800 dark:text-amber-300 hover:bg-amber-400/15">
                <Flame className="w-4 h-4 mr-2" />
                Tìm kèo giao lưu
              </Button>
            </Link>
          </div>

          {/* Biểu tượng các môn thể thao (SVG, nảy nhẹ) */}
          <div
            className="flex items-center justify-center gap-4 pt-8 select-none animate-fade-in stagger"
            style={{ '--i': 5 } as CSSProperties}
            aria-hidden
          >
            {SPORT_IDS.map((id, i) => (
              <span
                key={id}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-emerald-700 dark:text-emerald-400 shadow-sm"
                style={{ animation: `ball-bounce 2.4s ease-in-out ${i * 0.18}s infinite` }}
              >
                <SportIcon sport={id} className="h-6 w-6" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 border-t border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-12 space-y-2">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground">Mọi thứ trong một nơi</h2>
            <p className="text-sm text-muted-foreground">Từ lúc chọn sân đến lúc rủ bạn bè ra chơi.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} index={i}>
                <div className="card-lift h-full p-7 rounded-2xl border border-border bg-card shadow-sm space-y-4 hover:border-emerald-500/40">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.tone}`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border/60">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground">Bốn bước là có sân</h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} index={i}>
                <div className="card-lift h-full p-6 rounded-2xl border border-border bg-card relative overflow-hidden">
                  <span
                    className="absolute -top-1 right-3 text-6xl font-extrabold text-emerald-500/15 leading-none"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {step.n}
                  </span>
                  <h3 className="font-bold text-lg text-foreground relative">{step.t}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed relative">{step.d}</p>
                </div>
              </Reveal>
            ))}
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
