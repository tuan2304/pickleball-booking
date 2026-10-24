import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { sessionStorage } from './secure-storage'

// Cấu hình trong mobile/.env (xem .env.example). Chỉ dùng anon key, tuyệt đối không đưa service_role vào app.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Thiếu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Hãy tạo mobile/.env từ .env.example')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Phiên đăng nhập nằm trong Keychain/Keystore, không phải AsyncStorage không mã hóa
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

