import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hlaawnushcfuzidzwvww.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsYWF3bnVzaGNmdXppZHp3dnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDk5NjgsImV4cCI6MjEwNTc4NTk2OH0.H20NZMU-VqlCqXk-ALJirERjqR5nkx5Am6F5RX-577Y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

