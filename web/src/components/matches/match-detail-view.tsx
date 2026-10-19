'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { joinMatch, respondParticipant, leaveMatch, cancelMatch } from '@/app/actions/matches'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Flame,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  LogOut,
  Crown,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react'

import { MatchChatBox } from '@/components/matches/match-chat-box'
import { MatchMessage } from '@/types/database'

interface MatchDetailProps {
  match: {
    id: string
    title: string
    description: string | null
    sport_type: string
    skill_level: string
    required_players: number
    current_players: number
    cost_sharing_type: string
    cost_per_person: number | null
    status: string
    creator_id: string
    created_at: string
    creator: {
      id: string
      full_name: string
      avatar_url: string | null
      phone_number: string | null
    } | null
    booking: {
      id: string
      start_time: string
      end_time: string
      total_price: number
      court: {
        id: string
        name: string
        sport_type: string
        club: {
          id: string
          name: string
          address: string | null
          district: string | null
        } | null
      } | null
    } | null
  }
  participants: Array<{
    id: string
    user_id: string
    status: string
    message: string | null
    joined_at: string
    user: {
      id: string
      full_name: string
      avatar_url: string | null
      skill_level: string | null
    } | null
  }>
  initialMessages?: MatchMessage[]
  currentUserId: string | null
}

const SPORT_NAMES: Record<string, string> = {
  football: '⚽ Bóng đá',
  badminton: '🏸 Cầu lông',
  pickleball: '🏓 Pickleball',
  tennis: '🎾 Tennis',
  basketball: '🏀 Bóng rổ',
}

const SKILL_LABELS: Record<string, { label: string; color: string }> = {
  all: { label: 'Mọi trình độ (Giao lưu)', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  beginner: { label: 'Mới chơi / Nhập môn', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  intermediate: { label: 'Trung bình / Khá', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  advanced: { label: 'Bán chuyên / Giỏi', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
}

export function MatchDetailView({
  match,
  participants,
  initialMessages = [],
  currentUserId,
}: MatchDetailProps) {
  const router = useRouter()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isHost = currentUserId === match.creator_id
  const userParticipant = participants.find((p) => p.user_id === currentUserId)

  const acceptedParticipants = participants.filter((p) => p.status === 'accepted')
  const pendingParticipants = participants.filter((p) => p.status === 'pending')

  const court = match.booking?.court
  const club = court?.club
  const startTime = match.booking?.start_time ? new Date(match.booking.start_time) : null
  const endTime = match.booking?.end_time ? new Date(match.booking.end_time) : null

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
    } else {
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
    } else {
      router.refresh()
    }
  }

  async function handleLeave() {
    if (!confirm('Bạn có chắc chắn muốn rời khỏi kèo này?')) return

    setLoading(true)
    setActionError(null)

    const res = await leaveMatch(match.id)
    setLoading(false)

    if (res?.error) {
      setActionError(res.error)
    } else {
      router.refresh()
    }
  }

  async function handleCancelMatch() {
    if (!confirm('Bạn có chắc chắn muốn hủy kèo này? Các thành viên sẽ nhận được thông báo.')) return

    setLoading(true)
    setActionError(null)

    const res = await cancelMatch(match.id)
    setLoading(false)

    if (res?.error) {
      setActionError(res.error)
    } else {
      router.refresh()
    }
  }

  const skillInfo = SKILL_LABELS[match.skill_level] || SKILL_LABELS.all

  return (
    <div className="space-y-6">
      {/* Back button */}
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
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Details & Participants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Match Banner Card */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/60 pb-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-semibold py-1 px-2.5 bg-background">
                    {SPORT_NAMES[match.sport_type] || match.sport_type}
                  </Badge>
                  <Badge variant="outline" className={`text-xs font-semibold py-1 px-2.5 ${skillInfo.color}`}>
                    {skillInfo.label}
                  </Badge>
                </div>

                <Badge
                  variant="outline"
                  className={
                    match.status === 'cancelled'
                      ? 'bg-red-500/10 text-red-600 border-red-500/30 text-xs font-bold'
                      : isFull
                      ? 'bg-muted text-muted-foreground border-border text-xs'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-bold'
                  }
                >
                  {match.status === 'cancelled'
                    ? 'Đã hủy kèo'
                    : isFull
                    ? 'Đã đủ người'
                    : `Còn ${slotsLeft} chỗ trống`}
                </Badge>
              </div>

              <CardTitle className="text-xl sm:text-2xl font-black text-foreground">
                {match.title}
              </CardTitle>

              {match.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                  {match.description}
                </p>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Venue & Time Slot Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Thời Gian Thi Đấu
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {startTime && endTime
                      ? `${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Thỏa thuận'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {startTime?.toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Địa Điểm & Sân Con
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {club?.name || 'Cụm Sân Thể Thao'} - {court?.name || 'Sân tiêu chuẩn'}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {club?.address || club?.district || 'Hồ Chí Minh'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roster / Participants Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Users className="w-4 h-4 text-amber-500" />
                    Danh Sách Thành Viên ({match.current_players}/{match.required_players})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chủ kèo và các bạn đã được duyệt tham gia
                  </p>
                </div>

                <Badge variant="outline" className="text-xs font-semibold">
                  {match.current_players} / {match.required_players} người
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Host Entry */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {match.creator?.full_name ? match.creator.full_name.charAt(0).toUpperCase() : 'H'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-0.5 rounded-full" title="Chủ phòng">
                      <Crown className="w-3 h-3" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>{match.creator?.full_name || 'Chủ kèo'}</span>
                      <Badge className="bg-amber-500 text-white text-[10px] py-0 px-1.5">
                        Chủ Kèo
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Người tổ chức</div>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    Leader
                  </Badge>
                </div>
              </div>

              {/* Accepted Participants */}
              {acceptedParticipants.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-xl">
                  Chưa có thành viên nào được duyệt. Hãy là người đầu tiên tham gia!
                </div>
              ) : (
                <div className="space-y-2">
                  {acceptedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                          {p.user?.full_name ? p.user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-foreground">
                            {p.user?.full_name || 'Người tham gia'}
                          </div>
                          {p.message && (
                            <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-muted-foreground/60" />
                              &ldquo;{p.message}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                          Đã Duyệt
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Host Only: Pending Applications */}
              {isHost && (
                <div className="pt-4 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Yêu Cầu Đang Chờ Duyệt ({pendingParticipants.length})
                    </h4>
                  </div>

                  {pendingParticipants.length === 0 ? (
                    <div className="text-center py-3 text-xs text-muted-foreground bg-muted/20 rounded-xl">
                      Hiện không có yêu cầu nào đang chờ xử lý.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingParticipants.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-600 font-bold flex items-center justify-center text-xs">
                              {p.user?.full_name ? p.user.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-foreground">
                                {p.user?.full_name || 'Ứng viên'}
                              </div>
                              {p.message && (
                                <div className="text-[11px] text-muted-foreground">
                                  Lời nhắn: &ldquo;{p.message}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              disabled={loading || isFull}
                              onClick={() => handleRespond(p.id, 'accepted')}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Chấp Nhận
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => handleRespond(p.id, 'rejected')}
                              className="h-7 text-xs text-red-600 hover:bg-red-500/10 border-red-500/30 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Từ Chối
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Chat Section */}
          <MatchChatBox
            matchId={match.id}
            currentUserId={currentUserId || undefined}
            initialMessages={initialMessages}
          />
        </div>

        {/* Right Col: Cost & Action Panel */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm sticky top-24">
            <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold text-foreground">
                Chi Phí & Tham Gia
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Cost Box */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Hình thức chia tiền sân:
                </div>
                <div className="text-sm font-bold text-foreground">
                  {match.cost_sharing_type === 'host_covers'
                    ? 'Chủ sân bao trọn (0đ)'
                    : 'Chia đều theo số người'}
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Số tiền mỗi người:</span>
                  <span className="text-lg font-black text-amber-600">
                    {match.cost_sharing_type === 'host_covers'
                      ? 'Miễn phí'
                      : `${Number(match.cost_per_person || 0).toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
              </div>

              {/* Status & CTA Controls */}
              <div className="space-y-3 pt-2">
                {!currentUserId ? (
                  <Link href={`/login?next=/matches/${match.id}`} className="block">
                    <Button className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer text-xs sm:text-sm">
                      Đăng Nhập Để Tham Gia
                    </Button>
                  </Link>
                ) : isHost ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-muted text-xs text-center font-medium text-muted-foreground">
                      Bạn là chủ tạo kèo này
                    </div>
                    {match.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        disabled={loading}
                        onClick={handleCancelMatch}
                        className="w-full text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
                      >
                        Hủy Kèo Ghép
                      </Button>
                    )}
                  </div>
                ) : userParticipant ? (
                  <div className="space-y-3">
                    {userParticipant.status === 'pending' && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs text-center font-semibold">
                        ⏳ Yêu cầu của bạn đang chờ chủ kèo duyệt
                      </div>
                    )}
                    {userParticipant.status === 'accepted' && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Bạn đã là thành viên chính thức của kèo!
                      </div>
                    )}
                    {userParticipant.status === 'rejected' && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs text-center font-semibold">
                        Yêu cầu tham gia của bạn đã bị từ chối bởi chủ kèo
                      </div>
                    )}

                    {userParticipant.status !== 'left' && (
                      <Button
                        variant="outline"
                        disabled={loading}
                        onClick={handleLeave}
                        className="w-full text-xs text-muted-foreground hover:text-red-600 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1" />
                        Rời khỏi kèo này
                      </Button>
                    )}
                  </div>
                ) : isFull ? (
                  <Button disabled className="w-full h-10 text-xs font-bold">
                    Kèo Đã Đủ Số Lượng
                  </Button>
                ) : match.status === 'cancelled' ? (
                  <Button disabled className="w-full h-10 text-xs font-bold text-muted-foreground">
                    Kèo Này Đã Bị Hủy
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer text-sm shadow-md shadow-amber-500/20"
                  >
                    <Flame className="w-4 h-4 mr-1.5" />
                    Xin Tham Gia Kèo Này
                  </Button>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Chủ kèo sẽ liên hệ và duyệt bạn vào nhóm thi đấu
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Join Request Modal */}
      <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Gửi Yêu Cầu Tham Gia Kèo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Gửi lời nhắn cho chủ kèo về trình độ của bạn hoặc lời chào giao lưu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="joinMsg" className="text-xs font-semibold">
                Lời nhắn gửi chủ kèo (tùy chọn)
              </Label>
              <Input
                id="joinMsg"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Ví dụ: Mình đánh cầu được 1 năm, cho mình xin 1 slot nhé..."
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/60 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground">Quy định giao lưu:</div>
              <div>• Có mặt đúng giờ đã hẹn tại cụm sân.</div>
              <div>• Mang trang phục thể thao và vợt/giày phù hợp.</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsJoinModalOpen(false)}
                className="cursor-pointer text-xs"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={loading}
                onClick={handleJoinSubmit}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  'Gửi Yêu Cầu'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
