import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { colors } from '../theme/colors'
import { supabase } from '../lib/supabase'
import { Booking } from '../types'
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react-native'

export default function MyBookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadBookings() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBookings([])
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          court:courts (
            name,
            sport_type,
            club:clubs (
              name,
              address,
              district,
              city
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data as any || [])
    } catch (err: any) {
      console.error('Lỗi tải lịch đặt sân:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  function formatTime(iso: string) {
    const d = new Date(iso)
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    return `${time} • ${date}`
  }

  function renderBookingItem({ item }: { item: Booking }) {
    const court = item.court
    const club = court?.club
    const isConfirmed = item.status === 'confirmed'

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courtName}>{court?.name || 'Sân tiêu chuẩn'}</Text>
            <Text style={styles.clubName}>{club?.name || 'Cụm sân'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isConfirmed ? styles.statusConfirmed : styles.statusPending,
            ]}
          >
            {isConfirmed ? (
              <CheckCircle size={12} color={colors.success} />
            ) : (
              <AlertCircle size={12} color={colors.warning} />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isConfirmed ? colors.success : colors.warning },
              ]}
            >
              {isConfirmed ? 'Đã cọc' : 'Chờ cọc (15p)'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Từ: {formatTime(item.start_time)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Đến: {formatTime(item.end_time)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {club?.address}, {club?.district || club?.city}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.label}>Tổng tiền</Text>
            <Text style={styles.price}>
              {Number(item.total_price).toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Tiền cọc</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              {Number(item.deposit_amount).toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch Đặt Sân Của Tôi</Text>
        <Text style={styles.subtitle}>Danh sách các khung giờ bạn đã đặt và giữ chỗ</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadBookings()
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Calendar size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Bạn chưa có đơn đặt sân nào</Text>
              <Text style={styles.emptyDesc}>
                Khám phá các cụm sân và đặt chỗ ngay để sẵn sàng tập luyện!
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: 'black',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  courtName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  clubName: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: '80%',
  },
})

