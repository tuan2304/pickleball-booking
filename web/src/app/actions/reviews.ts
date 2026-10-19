'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ClubReview } from '@/types/database'

export async function getClubReviews(clubId: string): Promise<ClubReview[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('club_reviews')
    .select(`
      id,
      club_id,
      user_id,
      rating,
      comment,
      created_at,
      updated_at,
      profile:profiles (
        id,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching club reviews:', error)
    return []
  }

  return (data as any) || []
}

export async function submitClubReview(
  clubId: string,
  rating: number,
  comment?: string
) {
  if (rating < 1 || rating > 5) {
    return { error: 'Điểm đánh giá phải từ 1 đến 5 sao' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập để gửi đánh giá' }
  }

  const { data, error } = await supabase
    .from('club_reviews')
    .upsert(
      {
        club_id: clubId,
        user_id: user.id,
        rating: Math.round(rating),
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'club_id,user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error submitting review:', error)
    return { error: error.message }
  }

  revalidatePath(`/clubs/${clubId}`)
  return { success: true, review: data }
}

