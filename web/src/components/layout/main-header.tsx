import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Suspense } from 'react'
import { getCurrentUser, getCurrentProfile } from '@/lib/supabase/session'
import { logout } from '@/app/actions/auth'
import { Avatar } from '@/components/profile/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Compass, Calendar, Building2, LogOut, Flame, LifeBuoy, ShieldCheck } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

import { Logo } from '@/components/brand/logo'
/** Khung header hiển thị ngay lập tức trong lúc chờ thông tin đăng nhập */
function HeaderFallback() {
  return (
    <header className="border-b border-border/70 bg-background/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="SportArena, về trang chủ" className="flex items-center">
          <Logo size={36} />
        </Link>
        <div className="skeleton h-8 w-32 rounded-lg" />
      </div>
    </header>
  )
}

export function MainHeader() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderContent />
    </Suspense>
  )
}

async function HeaderContent() {
  const user = await getCurrentUser()
  const profile = user ? await getCurrentProfile() : null

  const isOwner = profile?.role === 'owner'
  const isAdmin = profile?.role === 'admin'

  return (
    <header className="border-b border-border/70 bg-background/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="SportArena, về trang chủ" className="group/logo flex items-center">
          <Logo
            size={36}
            markClassName="transition-transform duration-300 group-hover/logo:rotate-6 group-hover/logo:scale-105"
          />
        </Link>

        {/* Center Nav Links */}
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
            Lịch Đặt Của Tôi
          </Link>
          {user && (
            <Link
              href="/support"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <LifeBuoy className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Hỗ Trợ
            </Link>
          )}
          {/* Chỉ hiện Cổng Chủ Sân nếu người dùng là owner */}
          {isOwner && (
            <Link
              href="/owner/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Cổng Chủ Sân
            </Link>
          )}
        </nav>

        {/* User Auth Info */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link href="/admin">
                  <Button size="sm" className="text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-900 cursor-pointer shadow-sm shadow-amber-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                    <span className="hidden sm:inline">Trang quản trị</span>
                    <span className="sm:hidden">Quản trị</span>
                  </Button>
                </Link>
              )}
              <NotificationBell userId={user.id} />

              <Link
                href="/profile"
                aria-label="Hồ sơ của tôi"
                className="flex items-center gap-2 pl-1 pr-1.5 py-0.5 rounded-full hover:bg-muted/60 transition-colors"
              >
                <Avatar name={profile?.full_name} src={profile?.avatar_url} size={32} />
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-bold text-foreground truncate max-w-[120px]">
                    {profile?.full_name || 'Người chơi'}
                  </div>
                  <Badge variant="outline" className="text-xs py-0 px-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                    {isAdmin ? 'Quản trị' : isOwner ? 'Chủ sân' : 'Người chơi'}
                  </Badge>
                </div>
              </Link>

              <form action={logout}>
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
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
                <Button variant="ghost" size="sm" className="text-sm font-semibold cursor-pointer">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer shadow-sm shadow-emerald-600/20">
                  Đăng ký
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
