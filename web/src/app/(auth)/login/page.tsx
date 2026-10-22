import { redirect } from 'next/navigation'
import { getSupabase, getCurrentUser } from '@/lib/supabase/session'
import { LoginForm } from '@/components/auth/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đăng nhập - Đặt Sân & Ghép Kèo',
  description: 'Đăng nhập vào hệ thống quản lý sân thể thao và ghép kèo',
}

export default async function LoginPage() {
  const supabase = await getSupabase()
  const user = await getCurrentUser()

  // Nếu đã đăng nhập, điều hướng về trang chủ
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'owner') {
      redirect('/owner/dashboard')
    } else {
      redirect('/')
    }
  }

  return <LoginForm />
}
