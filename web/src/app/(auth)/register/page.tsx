import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from '@/components/auth/register-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đăng ký tài khoản - Đặt Sân & Ghép Kèo',
  description: 'Đăng ký tài khoản Người chơi hoặc Chủ sân để bắt đầu',
}

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Nếu đã đăng nhập, điều hướng về trang chủ phù hợp
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

  return <RegisterForm />
}
