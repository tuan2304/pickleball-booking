'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { joinMatch, respondParticipant, leaveMatch, cancelMatch } from '@/app/actions/matches'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { MatchChatBox } from '@/components/matches/match-chat-box'
import { MatchBanner } from '@/components/matches/detail/match-banner'
import { MatchRoster } from '@/components/matches/detail/match-roster'
import { MatchActionPanel } from '@/components/matches/detail/match-action-panel'
import { JoinRequestDialog } from '@/components/matches/detail/join-request-dialog'
import type { MatchDetail, MatchParticipantItem, MatchMessage } from '@/components/matches/detail/types'

import { toast } from 'sonner'
import { useConfirm } from '@/components/ui/confirm-dialog'
export interface MatchDetailProps {
  match: MatchDetail
  participants: MatchParticipantItem[]
  initialMessages?: MatchMessage[]
  currentUserId: string | null
}

export function MatchDetailView({
  match,
  participants,
  initialMessages = [],
  currentUserId,
}: MatchDetailProps) {
  const router = useRouter()
  const askConfirm = useConfirm()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isHost = currentUserId === match.creator_id
  const userParticipant = participants.find((p) => p.user_id === currentUserId)

  const isFull = match.status === 'full' || match.current_players >= match.required_players
  const slotsLeft = Math.max(0, match.required_players - match.current_players)

  // Real-time synchronization
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`match_${match.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_participants', filter: `match_id=eq.${match.id}` },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id, router])

  // Handlers
  async function handleJoinSubmit() {
    setLoading(true)
    setActionError(null)

    const res = await joinMatch(match.id, joinMessage)
    setLoading(false)

    if (res?.error) {
      setActionError(res.error)
      toast.error(res.error)
    } else {
      toast.success('Đã gửi yêu cầu tham gia', { description: 'Chủ kèo sẽ duyệt và báo cho bạn.' })
      setIsJoinModalOpen(false)
      setJoinMessage('')
      router.refresh()
    }
  }

  async function handleRespond(participantId: string, status: 'accepted' | 'rejected') {
    setLoading(true)
    setActionError(null)

    const res = await respondParticipant(participantId, status)
    setLoading(false)

    if (res?.error) {
      setActionError(res.error)
      toast.error(res.error)
    } else {
      toast.success(status === 'accepted' ? 'Đã duyệt thành viên' : 'Đã từ chối yêu cầu')
      router.refresh()
    }
  }

  async function handleLeave() {
    const ok = await askConfirm({
      title: 'Rời khỏi kèo này?',
      description: 'Bạn sẽ mất chỗ trong kèo và phải xin tham gia lại nếu muốn quay lại.',
      confirmText: 'Rời kèo',
      cancelText: 'Ở lại',
      destructive: true,
    })
    if (!ok) return

    setLoading(true)
    setActionError(null)

    const res = await leaveMatch(match.id)
    setLoading(false)

    if (res?.error) {
      setActionError(res.error)
      toast.error(res.error)
    } else {
      toast.success('Đã rời khỏi kèo')
      router.refresh()
    }
  }

  async function handleCancelMatch() {
    const ok = await askConfirm({
      title: 'Hủy kèo này?',
      description: 'Các thành viên đã được duyệt sẽ nhận thông báo kèo bị hủy. Thao tác này không hoàn tác được.',
      confirmText: 'Hủy kèo',
      cancelText: 'Giữ lại',
      destructive: true,
    })
    if (!ok) return

    setLoading(true)
    setActionError(null)

    const res = await cancelMatch(match.id)
    setLoading(false)

    if (res?.error) {
      setActionError(res.error)
      toast.error(res.error)
    } else {
      toast.success('Đã hủy kèo')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách kèo
        </Link>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <MatchBanner match={match} isFull={isFull} slotsLeft={slotsLeft} />

          <MatchRoster
            match={match}
            participants={participants}
            isHost={isHost}
            isFull={isFull}
            loading={loading}
            onRespond={handleRespond}
          />

          {isHost || userParticipant?.status === 'accepted' ? (
            <MatchChatBox
              matchId={match.id}
              currentUserId={currentUserId || undefined}
              initialMessages={initialMessages}
            />
          ) : (
            <Card className="border-dashed border-border shadow-sm">
              <CardContent className="p-8 text-center space-y-2">
                <div className="text-sm font-bold text-foreground">Phòng chat dành cho thành viên</div>
                <p className="text-xs text-muted-foreground">
                  Hãy gửi yêu cầu tham gia. Khi chủ kèo duyệt, bạn sẽ vào được phòng chat của kèo này.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <MatchActionPanel
            match={match}
            currentUserId={currentUserId}
            isHost={isHost}
            isFull={isFull}
            userParticipant={userParticipant}
            loading={loading}
            onJoinClick={() => setIsJoinModalOpen(true)}
            onLeave={handleLeave}
            onCancelMatch={handleCancelMatch}
          />
        </div>
      </div>

      <JoinRequestDialog
        open={isJoinModalOpen}
        onOpenChange={setIsJoinModalOpen}
        message={joinMessage}
        onMessageChange={setJoinMessage}
        loading={loading}
        onSubmit={handleJoinSubmit}
      />
    </div>
  )
}
