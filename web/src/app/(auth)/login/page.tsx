import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đăng nhập - Đặt Sân & Ghép Kèo',
  description: 'Đăng nhập vào hệ thống quản lý sân thể thao và ghép kèo',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
