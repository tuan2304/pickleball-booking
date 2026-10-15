'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/app/actions/notifications'

export interface CreateMatchInput {
  bookingId: string
  title: string
  description?: string
  sportType: string
  skillLevel?: 'all' | 'beginner' | 'intermediate' | 'advanced'
  requiredPlayers: number
  costSharingType?: 'split' | 'host_covers'
  costPerPerson?: number
}

export async function createMatch(input: CreateMatchInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập để tạo bài ghép kèo' }
  }

  // 1. Kiểm tra booking có tồn tại và thuộc sở hữu của user không
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, user_id, court_id, total_price, court:courts (sport_type)')
    .eq('id', input.bookingId)
    .single()

  if (bookingErr || !booking) {
    return { error: 'Không tìm thấy thông tin đơn đặt sân tương ứng' }
  }

  if (booking.user_id !== user.id) {
    return { error: 'Bạn chỉ có thể tạo ghép kèo cho đơn đặt sân của chính mình' }
  }

  // 2. Kiểm tra xem booking đã có match nào chưa
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('booking_id', input.bookingId)
    .maybeSingle()

  if (existingMatch) {
    return { error: 'Đơn đặt sân này đã được mở ghép kèo trước đó' }
  }

  // 3. Tính toán chi phí mỗi người nếu là chia đều
  let costPerPerson = input.costPerPerson ?? 0
  if (input.costSharingType === 'split' && !input.costPerPerson) {
    const totalP = Number(booking.total_price) || 0
    const count = Math.max(1, input.requiredPlayers)
    costPerPerson = Math.round(totalP / count)
  } else if (input.costSharingType === 'host_covers') {
    costPerPerson = 0
  }

  const courtData = booking.court as unknown as { sport_type: string } | null
  const sportType = input.sportType || courtData?.sport_type || 'football'

  // 4. Tạo match record
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .insert({
      booking_id: input.bookingId,
      creator_id: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      sport_type: sportType,
      skill_level: input.skillLevel || 'all',
      required_players: Math.max(1, input.requiredPlayers),
      current_players: 1, // Chủ phòng tính là 1
      cost_sharing_type: input.costSharingType || 'split',
      cost_per_person: costPerPerson,
      status: 'open',
    })
    .select('id')
    .single()

  if (matchErr) {
    return { error: matchErr.message || 'Không thể tạo kèo ghép. Vui lòng thử lại.' }
  }

  // 5. Cập nhật cờ is_open_match trong bookings
  await supabase
    .from('bookings')
    .update({ is_open_match: true })
    .eq('id', input.bookingId)

  revalidatePath('/matches')
  revalidatePath('/my-bookings')
  revalidatePath(`/matches/${match.id}`)

  return { matchId: match.id }
}

export async function joinMatch(matchId: string, message?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập để gửi yêu cầu tham gia' }
  }

  // 1. Kiểm tra match
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, creator_id, title, status, current_players, required_players')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return { error: 'Không tìm thấy thông tin kèo thể thao' }
  }

  if (match.creator_id === user.id) {
    return { error: 'Bạn là chủ tạo kèo này nên không cần gửi yêu cầu tham gia' }
  }

  if (match.status !== 'open') {
    return { error: 'Kèo này hiện đã đóng hoặc đã đủ người tham gia' }
  }

  // 2. Kiểm tra xem đã gửi yêu cầu trước đó chưa
  const { data: existingParticipant } = await supabase
    .from('match_participants')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingParticipant) {
    if (existingParticipant.status === 'pending') {
      return { error: 'Bạn đã gửi yêu cầu tham gia rồi, vui lòng chờ chủ kèo duyệt' }
    }
    if (existingParticipant.status === 'accepted') {
      return { error: 'Bạn đã là thành viên chính thức của kèo này' }
    }
    if (existingParticipant.status === 'rejected') {
      return { error: 'Yêu cầu trước đó của bạn đã bị từ chối bởi chủ kèo' }
    }
    // Nếu status = 'left', cho phép tham gia lại bằng cách update
    const { error: reapplyErr } = await supabase
      .from('match_participants')
      .update({
        status: 'pending',
        message: message?.trim() || null,
        joined_at: new Date().toISOString(),
      })
      .eq('id', existingParticipant.id)

    if (reapplyErr) return { error: reapplyErr.message }

    // Gửi thông báo cho chủ kèo
    await createNotification({
      userId: match.creator_id,
      title: 'Có người xin tham gia kèo! 🏓',
      message: `Một người chơi vừa gửi lại yêu cầu tham gia kèo "${match.title}".`,
      type: 'match',
      link: `/matches/${matchId}`,
    })

    revalidatePath(`/matches/${matchId}`)
    return { success: true }
  }

  // 3. Tạo mới participant record
  const { error: insertErr } = await supabase
    .from('match_participants')
    .insert({
      match_id: matchId,
      user_id: user.id,
      status: 'pending',
      message: message?.trim() || null,
    })

  if (insertErr) {
    return { error: insertErr.message || 'Không thể gửi yêu cầu tham gia' }
  }

  // Gửi thông báo cho chủ kèo
  await createNotification({
    userId: match.creator_id,
    title: 'Có người xin tham gia kèo! 🏓',
    message: `Một người chơi vừa gửi yêu cầu tham gia kèo "${match.title}". Bấm để xem và duyệt thành viên.`,
    type: 'match',
    link: `/matches/${matchId}`,
  })

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function respondParticipant(
  participantId: string,
  newStatus: 'accepted' | 'rejected'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập' }
  }

  // 1. Kiểm tra quyền chủ kèo
  const { data: participant, error: pErr } = await supabase
    .from('match_participants')
    .select(`
      id,
      status,
      match_id,
      user_id,
      match:matches (
        id,
        title,
        creator_id,
        status,
        current_players,
        required_players
      )
    `)
    .eq('id', participantId)
    .single()

  if (pErr || !participant) {
    return { error: 'Không tìm thấy thông tin người tham gia' }
  }

  const match = participant.match as unknown as {
    id: string
    title: string
    creator_id: string
    status: string
    current_players: number
    required_players: number
  } | null

  if (!match || match.creator_id !== user.id) {
    return { error: 'Chỉ chủ phòng mới có quyền duyệt thành viên' }
  }

  // 2. Cập nhật trạng thái người tham gia
  const { error: updateErr } = await supabase
    .from('match_participants')
    .update({ status: newStatus })
    .eq('id', participantId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  // 3. Nếu duyệt 'accepted', cập nhật số lượng current_players trong match
  if (newStatus === 'accepted' && participant.status !== 'accepted') {
    const nextCurrent = match.current_players + 1
    const isFull = nextCurrent >= match.required_players

    await supabase
      .from('matches')
      .update({
        current_players: nextCurrent,
        status: isFull ? 'full' : 'open',
      })
      .eq('id', match.id)
  }

  // 4. Gửi thông báo cho Ứng viên
  const isAccepted = newStatus === 'accepted'
  if (participant.user_id) {
    await createNotification({
      userId: participant.user_id,
      title: isAccepted ? 'Yêu cầu tham gia đã được duyệt! 🎉' : 'Yêu cầu tham gia bị từ chối',
      message: isAccepted
        ? `Chủ kèo đã duyệt bạn vào kèo "${match.title || 'giao lưu'}". Hãy chuẩn bị đồ và ra sân đúng giờ nhé!`
        : `Rất tiếc, yêu cầu tham gia kèo "${match.title || 'giao lưu'}" của bạn đã bị từ chối bởi chủ kèo.`,
      type: 'match',
      link: `/matches/${match.id}`,
    })
  }

  revalidatePath(`/matches/${match.id}`)
  return { success: true }
}

export async function leaveMatch(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập' }
  }

  const { data: participant } = await supabase
    .from('match_participants')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!participant) {
    return { error: 'Bạn chưa tham gia kèo này' }
  }

  const wasAccepted = participant.status === 'accepted'

  const { error: updateErr } = await supabase
    .from('match_participants')
    .update({ status: 'left' })
    .eq('id', participant.id)

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Nếu người rời đã từng được duyệt, giảm current_players và mở lại nếu đang full
  if (wasAccepted) {
    const { data: match } = await supabase
      .from('matches')
      .select('current_players, required_players')
      .eq('id', matchId)
      .single()

    if (match) {
      const nextCurrent = Math.max(1, match.current_players - 1)
      await supabase
        .from('matches')
        .update({
          current_players: nextCurrent,
          status: 'open',
        })
        .eq('id', matchId)
    }
  }

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function cancelMatch(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập' }
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, creator_id, booking_id')
    .eq('id', matchId)
    .single()

  if (!match || match.creator_id !== user.id) {
    return { error: 'Chỉ chủ phòng mới có thể hủy kèo này' }
  }

  await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('id', matchId)

  await supabase
    .from('bookings')
    .update({ is_open_match: false })
    .eq('id', match.booking_id)

  revalidatePath('/matches')
  revalidatePath('/my-bookings')
  revalidatePath(`/matches/${matchId}`)

  return { success: true }
}
