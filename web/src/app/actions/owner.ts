'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notify'
import { checkCourtAllowance } from '@/lib/club-limits'
import { requireClubOwner } from '@/lib/auth-guards'
import { isValidLatLng } from '@/lib/maps'

export async function createClub(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Bạn cần đăng nhập để thực hiện tác vụ này' }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'owner' && profile?.role !== 'admin') {
    return { error: 'Chỉ tài khoản chủ sân mới tạo được cụm sân' }
  }

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const description = formData.get('description') as string
  const city = formData.get('city') as string || 'Hồ Chí Minh'
  const district = formData.get('district') as string
  const openTime = formData.get('openTime') as string || '06:00:00'
  const closeTime = formData.get('closeTime') as string || '23:00:00'
  const amenitiesRaw = formData.get('amenities') as string

  // Toạ độ (tùy chọn) do bộ chọn vị trí gửi lên; bỏ trống thì khách thấy bản đồ tìm theo địa chỉ
  const latRaw = String(formData.get('latitude') ?? '').trim()
  const lngRaw = String(formData.get('longitude') ?? '').trim()
  let latitude: number | null = null
  let longitude: number | null = null
  if (latRaw || lngRaw) {
    latitude = Number(latRaw)
    longitude = Number(lngRaw)
    if (!isValidLatLng(latitude, longitude)) {
      return { error: 'Toạ độ vị trí không hợp lệ' }
    }
  }

  const amenities = amenitiesRaw
    ? amenitiesRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : ['wifi', 'parking', 'shower']

  if (!name || !address) {
    return { error: 'Vui lòng nhập tên cụm sân và địa chỉ' }
  }

  const { data, error } = await supabase.from('clubs').insert({
    owner_id: user.id,
    name,
    address,
    description,
    city,
    district,
    open_time: openTime,
    close_time: closeTime,
    amenities,
    latitude,
    longitude,
    images: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'],
  }).select().single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/clubs')
  revalidatePath('/owner/dashboard')
  return { success: true, club: data }
}

export async function createCourt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Bạn cần đăng nhập' }
  }

  const clubId = formData.get('clubId') as string
  const name = formData.get('name') as string
  const sportType = formData.get('sportType') as string
  const surfaceType = formData.get('surfaceType') as string || 'Tiêu chuẩn'
  const basePrice = Number(formData.get('basePricePerHour')) || 150000
  const depositPercentage = Number(formData.get('depositPercentage')) || 30

  if (!clubId || !name || !sportType) {
    return { error: 'Vui lòng điền đủ thông tin sân con' }
  }

  const allowance = await checkCourtAllowance(supabase, clubId)
  if (!allowance.allowed) {
    return { error: allowance.message }
  }

  const { data, error } = await supabase.from('courts').insert({
    club_id: clubId,
    name,
    sport_type: sportType,
    surface_type: surfaceType,
    base_price_per_hour: basePrice,
    deposit_percentage: depositPercentage,
  }).select().single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/clubs')
  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/schedule')
  return { success: true, court: data }
}

export async function createPricingRule(formData: FormData) {
  const supabase = await createClient()
  const courtId = formData.get('courtId') as string
  const name = formData.get('name') as string
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const pricePerHour = Number(formData.get('pricePerHour'))

  if (!courtId || !name || !startTime || !endTime || !pricePerHour) {
    return { error: 'Vui lòng nhập đầy đủ thông tin khung giá' }
  }

  const { error } = await supabase.from('court_pricing_rules').insert({
    court_id: courtId,
    name,
    start_time: startTime,
    end_time: endTime,
    price_per_hour: pricePerHour,
    days_of_week: [1, 2, 3, 4, 5, 6, 0],
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/pricing')
  return { success: true }
}

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled' | 'completed') {
  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    return { error: 'Trạng thái không hợp lệ' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vui lòng đăng nhập' }

  // RLS cho cả người đặt lẫn chủ sân xem được đơn, nên phải kiểm tra rõ ràng đây là chủ cụm sân
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id, status, start_time, court:courts ( name, club:clubs ( name, owner_id ) )')
    .eq('id', bookingId)
    .maybeSingle()

  const court = booking?.court as unknown as { name: string; club: { name: string; owner_id: string } | null } | null
  if (!booking || court?.club?.owner_id !== user.id) {
    return { error: 'Bạn không có quyền thao tác đơn đặt sân này' }
  }

  const allowed: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'], // chủ sân nhận cọc tiền mặt / từ chối
    confirmed: ['completed', 'cancelled'],
  }
  if (!allowed[booking.status]?.includes(status)) {
    return { error: 'Không thể chuyển đơn từ trạng thái hiện tại sang trạng thái này' }
  }
  if (status === 'completed' && new Date(booking.start_time).getTime() > Date.now()) {
    return { error: 'Chưa đến giờ chơi nên chưa thể đánh dấu hoàn thành' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('bookings').update({ status }).eq('id', bookingId)
  if (error) {
    console.error('updateBookingStatus lỗi', error)
    return { error: 'Không thể cập nhật đơn đặt sân' }
  }

  if (status === 'cancelled') {
    await admin.from('payments').update({ status: 'cancelled' }).eq('booking_id', bookingId).eq('status', 'pending')
    await admin.from('matches').update({ status: 'cancelled' }).eq('booking_id', bookingId).in('status', ['open', 'full'])
  }

  const labels = { confirmed: 'đã được xác nhận', cancelled: 'đã bị chủ sân hủy', completed: 'đã hoàn thành' }
  await notifyUser({
    userId: booking.user_id,
    title: `Đơn đặt sân ${labels[status]}`,
    message: `Đơn đặt ${court.name} (${court.club?.name}) ${labels[status]}.`,
    type: 'booking',
    link: `/bookings/${bookingId}`,
  })

  revalidatePath('/owner/schedule')
  revalidatePath('/owner/dashboard')
  revalidatePath('/my-bookings')
  return { success: true }
}

export async function toggleCourtStatus(courtId: string, isActive: boolean) {
  const supabase = await createClient()

  if (isActive) {
    const { data: court } = await supabase.from('courts').select('club_id').eq('id', courtId).maybeSingle()
    if (!court) return { error: 'Không tìm thấy sân con' }
    const allowance = await checkCourtAllowance(supabase, court.club_id, { excludeCourtId: courtId })
    if (!allowance.allowed) return { error: allowance.message }
  }
  const { error } = await supabase
    .from('courts')
    .update({ is_active: isActive })
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/clubs')
  revalidatePath('/owner/schedule')
  return { success: true }
}

export async function deleteCourt(courtId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', courtId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/clubs')
  revalidatePath('/owner/schedule')
  revalidatePath('/owner/pricing')
  return { success: true }
}

export async function deleteClub(clubId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clubs')
    .delete()
    .eq('id', clubId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/clubs')
  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/schedule')
  return { success: true }
}

export async function deletePricingRule(ruleId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('court_pricing_rules')
    .delete()
    .eq('id', ruleId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/pricing')
  return { success: true }
}


/** Ghim hoặc xóa vị trí bản đồ của cụm sân (lat/lng = null để xóa). */
export async function updateClubLocation(clubId: string, lat: number | null, lng: number | null) {
  const auth = await requireClubOwner(clubId)
  if ('error' in auth) return { error: auth.error }

  const clearing = lat === null && lng === null
  if (!clearing && (lat === null || lng === null || !isValidLatLng(lat, lng))) {
    return { error: 'Toạ độ vị trí không hợp lệ' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('clubs').update({ latitude: lat, longitude: lng }).eq('id', clubId)
  if (error) {
    console.error('updateClubLocation lỗi', error)
    return { error: 'Không lưu được vị trí. Vui lòng thử lại.' }
  }

  revalidatePath('/owner/clubs')
  revalidatePath('/clubs')
  revalidatePath(`/clubs/${clubId}`)
  return { success: true }
}
