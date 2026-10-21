'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'

export type AuthResult = {
  error?: string
  success?: boolean
}

export async function login(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Vui lòng nhập đầy đủ email và mật khẩu' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Email hoặc mật khẩu không chính xác' }
  }

  if (data?.user) {
    // Lấy profile để điều hướng đúng dashboard theo vai trò
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    revalidatePath('/', 'layout')

    if (profile?.role === 'owner') {
      redirect('/owner/dashboard')
    } else {
      redirect('/')
    }
  }

  return { success: true }
}

export async function register(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phoneNumber = formData.get('phoneNumber') as string
  // Chỉ cho đăng ký player/owner, tuyệt đối không nhận 'admin' từ form
  const role: UserRole = formData.get('role') === 'owner' ? 'owner' : 'player'

  if (!email || !password || !fullName) {
    return { error: 'Vui lòng điền các thông tin bắt buộc (họ tên, email, mật khẩu)' }
  }

  if (password.length < 6) {
    return { error: 'Mật khẩu phải có ít nhất 6 ký tự' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  })

  if (error) {
    return { error: error.message || 'Không thể tạo tài khoản. Vui lòng thử lại.' }
  }

  if (data?.user) {
    // Cập nhật số điện thoại nếu có
    if (phoneNumber) {
      await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', data.user.id)
    }

    revalidatePath('/', 'layout')

    if (role === 'owner') {
      redirect('/owner/dashboard')
    } else {
      redirect('/')
    }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
