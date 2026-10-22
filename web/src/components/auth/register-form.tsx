'use client'

import { useState } from 'react'
import Link from 'next/link'
import { register } from '@/app/actions/auth'
import { UserRole } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Loader2, AlertCircle, Building2, User } from 'lucide-react'

import { LogoMark } from '@/components/brand/logo'
export function RegisterForm() {
  const [role, setRole] = useState<UserRole>('owner')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('role', role)

    const result = await register(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-xl border-emerald-500/20 bg-card/90 backdrop-blur-sm">
      <CardHeader className="space-y-2 text-center pb-6">
        <LogoMark size={56} className="mx-auto drop-shadow-sm" decorative={false} />
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Đăng ký tài khoản
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Chọn vai trò của bạn để trải nghiệm tính năng tối ưu nhất
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role selector cards */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Bạn tham gia với tư cách là?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer text-center gap-2 ${
                  role === 'owner'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm'
                    : 'border-border hover:border-emerald-500/40 bg-card text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg ${role === 'owner' ? 'bg-emerald-700 text-white' : 'bg-muted'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Chủ Sân / Quản Lý</div>
                  <div className="text-xs text-muted-foreground">Tạo sân & nhận cọc</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('player')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer text-center gap-2 ${
                  role === 'player'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm'
                    : 'border-border hover:border-emerald-500/40 bg-card text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg ${role === 'player' ? 'bg-emerald-700 text-white' : 'bg-muted'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Người Chơi</div>
                  <div className="text-xs text-muted-foreground">Tìm sân & ghép kèo</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Họ và tên</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Nguyễn Văn A"
              required
              className="h-10 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
                className="h-10 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber">Số điện thoại</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="0912345678"
                className="h-10 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu (tối thiểu 6 ký tự)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              className="h-10 focus-visible:ring-emerald-500"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang khởi tạo tài khoản...
              </>
            ) : (
              <>
                Đăng ký tài khoản {role === 'owner' ? 'Chủ Sân' : 'Người Chơi'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-500 hover:underline"
            >
              Đăng nhập tại đây
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
