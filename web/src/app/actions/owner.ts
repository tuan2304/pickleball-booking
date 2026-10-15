'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createClub(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Bạn cần đăng nhập để thực hiện tác vụ này' }
  }

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const description = formData.get('description') as string
  const city = formData.get('city') as string || 'Hồ Chí Minh'
  const district = formData.get('district') as string
  const openTime = formData.get('openTime') as string || '06:00:00'
  const closeTime = formData.get('closeTime') as string || '23:00:00'
  const amenitiesRaw = formData.get('amenities') as string

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
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/owner/schedule')
  revalidatePath('/owner/dashboard')
  return { success: true }
}

export async function toggleCourtStatus(courtId: string, isActive: boolean) {
  const supabase = await createClient()
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

