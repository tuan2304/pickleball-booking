import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { colors } from '../theme/colors'
import { supabase } from '../lib/supabase'

const MIN_PASSWORD = 8 // khớp với web (actions/auth.ts)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface AuthFormProps {
  onSignedIn: () => void
}

/** Đăng nhập / đăng ký bằng email và mật khẩu. Tài khoản đăng ký ở app luôn là người chơi; chủ sân đăng ký trên web. */
export default function AuthForm({ onSignedIn }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRegister = mode === 'register'

  async function submit() {
    setError(null)
    const mail = email.trim().toLowerCase()
    if (!EMAIL.test(mail)) return setError('Email không hợp lệ')
    if (!password) return setError('Vui lòng nhập mật khẩu')
    if (isRegister) {
      if (fullName.trim().length < 2) return setError('Họ tên cần ít nhất 2 ký tự')
      if (password.length < MIN_PASSWORD) return setError(`Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự`)
    }

    setBusy(true)
    try {
      if (isRegister) {
        const { data, error: err } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { data: { full_name: fullName.trim(), role: 'player' } },
        })
        if (err) return setError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
        if (!data.session) {
          // Dự án bật xác nhận email: chưa có phiên cho tới khi bấm link trong thư
          Alert.alert('Kiểm tra email', 'Chúng tôi đã gửi thư xác nhận. Hãy bấm vào liên kết trong thư rồi đăng nhập.')
          setMode('login')
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password })
        if (err) return setError('Email hoặc mật khẩu không chính xác')
      }
      setPassword('')
      onSignedIn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</Text>
      <Text style={styles.sub}>Đăng nhập để đặt sân, tham gia kèo và nhận thông báo.</Text>

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Họ và tên"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          textContentType="name"
          maxLength={60}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        style={styles.input}
        placeholder={isRegister ? `Mật khẩu (tối thiểu ${MIN_PASSWORD} ký tự)` : 'Mật khẩu'}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        textContentType={isRegister ? 'newPassword' : 'password'}
        onSubmitEditing={submit}
      />

      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy} accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setMode(isRegister ? 'login' : 'register')
          setError(null)
        }}
        style={styles.switch}
      >
        <Text style={styles.switchText}>{isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, gap: 12 },
  title: { color: colors.textPrimary, fontWeight: '800', fontSize: 20 },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontSize: 14,
  },
  error: { color: colors.danger, fontSize: 13 },
  btn: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  switch: { minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  switchText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
})
