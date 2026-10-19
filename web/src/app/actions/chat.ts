'use server'

import { createClient } from '@/lib/supabase/server'
import { MatchMessage } from '@/types/database'

export async function getMatchMessages(matchId: string): Promise<MatchMessage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('match_messages')
    .select(`
      id,
      match_id,
      user_id,
      content,
      created_at,
      profile:profiles (
        id,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching match messages:', error)
    return []
  }

  return (data as any) || []
}

export async function sendMatchMessage(matchId: string, content: string) {
  if (!content || !content.trim()) {
    return { error: 'Nội dung tin nhắn không được để trống' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vui lòng đăng nhập để gửi tin nhắn' }
  }

  const { data, error } = await supabase
    .from('match_messages')
    .insert({
      match_id: matchId,
      user_id: user.id,
      content: content.trim(),
    })
    .select(`
      id,
      match_id,
      user_id,
      content,
      created_at,
      profile:profiles (
        id,
        full_name,
        avatar_url,
        role
      )
    `)
    .single()

  if (error) {
    console.error('Error sending message:', error)
    return { error: error.message }
  }

  return { success: true, message: data }
}

