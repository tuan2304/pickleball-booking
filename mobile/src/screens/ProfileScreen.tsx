import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { colors } from '../theme/colors'
import { supabase } from '../lib/supabase'
import AuthForm from '../components/AuthForm'
import ProfileEditForm from '../components/ProfileEditForm'
import { skillLabel } from '../shared/profile'
import { Profile } from '../types'
import { User, Shield, LogOut, CheckCircle, Smartphone } from 'lucide-react-native'

const SAMPLE_USERS = [
  {
    role: 'owner',
    email: 'owner@sportarena.vn',
    name: 'Nguyễn Văn Chủ Sân (Owner)',
    desc: 'Quản lý 3 cụm sân, xem timeline lịch & doanh thu',
  },
  {
    role: 'player',
    email: 'player1@sportarena.vn',
    name: 'Trần Quốc Huy (Chủ Kèo)',
    desc: 'Người mở kèo Pickleball đôi',
  },
  {
    role: 'player',
    email: 'player2@sportarena.vn',
    name: 'Lê Hoàng Long (Ứng viên)',
    desc: 'Đã tham gia kèo Pickleball giao lưu',
  },
]

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState(false)

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setCurrentUserEmail(session.user.email || null)
        // Số điện thoại bị khóa đọc trực tiếp; hàm này chỉ trả hồ sơ của chính mình (kể cả số điện thoại)
        const { data: mine } = await supabase.rpc('get_my_profile')
        if (mine && mine.length > 0) {
          setProfile(mine[0] as Profile)
          setPhone(mine[0].phone_number ?? '')
        } else {
          // Dự phòng khi hàm chưa có trên database: chỉ lấy các cột công khai
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role, skill_level, rating')
            .eq('id', session.user.id)
            .single()
          setProfile(data)
        }
      } else {
        setProfile(null)
        setCurrentUserEmail(null)
      }
    } catch (err: any) {
      console.error('Lỗi check session:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  async function quickLogin(email: string) {
    setSwitching(true)
    try {
      await supabase.auth.signOut()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '',
      })

      if (error) {
        Alert.alert('Lỗi đăng nhập', error.message)
      } else {
        Alert.alert('Thành công', `Đã chuyển sang tài khoản ${email}`)
        await checkSession()
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message)
    } finally {
      setSwitching(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setProfile(null)
    setCurrentUserEmail(null)
    Alert.alert('Thông báo', 'Bạn đã đăng xuất')
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current User Card */}
      {profile ? (
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            {profile.avatar_url && /^https?:\/\//i.test(profile.avatar_url) ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36 }} />
            ) : (
              <Text style={styles.avatarTextLarge}>
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <Text style={styles.userName}>{profile.full_name}</Text>
          <Text style={styles.userEmail}>{currentUserEmail}</Text>
          <Text style={styles.userEmail}>Trình độ: {skillLabel(profile.skill_level)}</Text>

          <View style={styles.roleBadge}>
            <Shield size={12} color={colors.primary} />
            <Text style={styles.roleText}>
              {profile.role === 'owner' ? 'CHỦ SÂN BÃI' : 'NGƯỜI CHƠI THỂ THAO'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing((v) => !v)} accessibilityRole="button">
            <Text style={styles.editText}>{editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa hồ sơ'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color={colors.danger} />
            <Text style={styles.logoutText}>Đăng Xuất</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <AuthForm onSignedIn={checkSession} />
      )}

      {profile && editing && (
        <ProfileEditForm
          userId={profile.id}
          initial={{
            fullName: profile.full_name ?? '',
            phone,
            skillLevel: profile.skill_level ?? 'intermediate',
          }}
          onSaved={() => {
            setEditing(false)
            checkSession()
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Quick Account Switcher: chỉ có ở bản dev, bị loại khỏi bản release */}
      {__DEV__ && (<>
      <Text style={styles.sectionTitle}>
        Chuyển Nhanh Tài Khoản Thử Nghiệm ⚡
      </Text>
      <Text style={styles.sectionSub}>
        Chọn tài khoản để trải nghiệm góc nhìn Chủ Sân hoặc Người Chơi ngay lập tức:
      </Text>

      <View style={styles.sampleList}>
        {SAMPLE_USERS.map((user) => {
          const isCurrent = currentUserEmail === user.email
          return (
            <TouchableOpacity
              key={user.email}
              style={[styles.sampleCard, isCurrent && styles.sampleCardActive]}
              activeOpacity={0.8}
              disabled={switching}
              onPress={() => quickLogin(user.email)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sampleName}>{user.name}</Text>
                  {isCurrent && <CheckCircle size={14} color={colors.success} />}
                </View>
                <Text style={styles.sampleEmail}>{user.email}</Text>
                <Text style={styles.sampleDesc}>{user.desc}</Text>
              </View>

              <View
                style={[
                  styles.switchPill,
                  isCurrent ? styles.switchPillActive : styles.switchPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.switchPillText,
                    isCurrent && { color: colors.white },
                  ]}
                >
                  {isCurrent ? 'Đang dùng' : 'Đăng nhập'}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
      </>)}

      {/* App Info Footer */}
      <View style={styles.appInfoBox}>
        <Smartphone size={16} color={colors.textMuted} />
        <Text style={styles.appInfoText}>
          SportArena Mobile App v1.0.0 (Expo SDK 58)
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  editBtn: {
    minHeight: 44,
    alignSelf: 'stretch',
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 4,
  },
  avatarTextLarge: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: 'black',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  roleText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.dangerLight,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: 'bold',
  },
  notLoggedCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  notLoggedTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  notLoggedDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -8,
  },
  sampleList: {
    gap: 10,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  sampleCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  sampleName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sampleEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sampleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchPillActive: {
    backgroundColor: colors.primary,
  },
  switchPillInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  switchPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  appInfoBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  appInfoText: {
    fontSize: 11,
    color: colors.textMuted,
  },
})

