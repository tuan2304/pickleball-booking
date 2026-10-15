import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Users, Flame, ArrowRight, ShieldCheck, Trophy } from 'lucide-react'

interface MatchCardProps {
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
    created_at: string
    creator: {
      id: string
      full_name: string
      avatar_url: string | null
      rating: number | null
    } | null
    booking: {
      id: string
      start_time: string
      end_time: string
      court: {
        id: string
        name: string
        club: {
          id: string
          name: string
          address: string | null
          district: string | null
        } | null
      } | null
    } | null
  }
}

const SPORT_ICONS: Record<string, string> = {
  football: '⚽',
  badminton: '🏸',
  pickleball: '🏓',
  tennis: '🎾',
  basketball: '🏀',
}

const SPORT_NAMES: Record<string, string> = {
  football: 'Bóng đá',
  badminton: 'Cầu lông',
  pickleball: 'Pickleball',
  tennis: 'Tennis',
  basketball: 'Bóng rổ',
}

const SKILL_LABELS: Record<string, { label: string; color: string }> = {
  all: { label: 'Mọi trình độ', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  beginner: { label: 'Mới chơi', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  intermediate: { label: 'Trung bình', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  advanced: { label: 'Bán chuyên', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
}

export function MatchCard({ match }: MatchCardProps) {
  const sportEmoji = SPORT_ICONS[match.sport_type] || '🏆'
  const sportName = SPORT_NAMES[match.sport_type] || match.sport_type
  const skillInfo = SKILL_LABELS[match.skill_level] || SKILL_LABELS.all

  const court = match.booking?.court
  const club = court?.club
  const startTime = match.booking?.start_time ? new Date(match.booking.start_time) : null
  const endTime = match.booking?.end_time ? new Date(match.booking.end_time) : null

  const isFull = match.status === 'full' || match.current_players >= match.required_players
  const slotsLeft = Math.max(0, match.required_players - match.current_players)

  const timeStr = startTime && endTime
    ? `${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    : 'Thời gian thỏa thuận'

  const dateStr = startTime
    ? startTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : ''

  const isHostCovers = match.cost_sharing_type === 'host_covers'
  const costNumber = Number(match.cost_per_person) || 0

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm hover:border-amber-500/40 hover:shadow-md transition-all group flex flex-col justify-between">
      <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs font-semibold py-0.5 px-2 bg-muted/60">
                {sportEmoji} {sportName}
              </Badge>
              <Badge variant="outline" className={`text-[11px] font-semibold py-0.5 px-2 ${skillInfo.color}`}>
                {skillInfo.label}
              </Badge>
            </div>

            <Badge
              variant="outline"
              className={
                isFull
                  ? 'bg-muted text-muted-foreground border-border text-xs'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-bold'
              }
            >
              {isFull ? 'Đã đủ người' : `Còn ${slotsLeft} chỗ trống`}
            </Badge>
          </div>

          {/* Title */}
          <div>
            <h3 className="font-bold text-base text-foreground group-hover:text-amber-500 transition-colors line-clamp-2">
              {match.title}
            </h3>
            {match.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {match.description}
              </p>
            )}
          </div>

          {/* Time & Venue */}
          <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{timeStr} • {dateStr}</span>
            </div>

            {club && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="line-clamp-1">
                  <strong className="text-foreground">{club.name}</strong> ({court?.name || 'Sân'}) - {club.address || club.district || 'TP.HCM'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer info: Host & Price */}
        <div className="pt-3 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            {/* Host info */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                {match.creator?.full_name ? match.creator.full_name.charAt(0).toUpperCase() : 'H'}
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground text-[10px] block">Chủ kèo</span>
                <span className="font-semibold text-foreground line-clamp-1">
                  {match.creator?.full_name || 'Người dùng'}
                </span>
              </div>
            </div>

            {/* Players count */}
            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full text-xs font-semibold text-foreground">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {match.current_players}/{match.required_players}
              </span>
            </div>
          </div>

          {/* Pricing & CTA */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <div className="text-[10px] text-muted-foreground">Chi phí tham gia</div>
              <div className="font-extrabold text-sm text-foreground">
                {isHostCovers ? (
                  <span className="text-emerald-600">Miễn phí (Chủ bao)</span>
                ) : (
                  <span className="text-amber-600">{costNumber.toLocaleString('vi-VN')} đ/người</span>
                )}
              </div>
            </div>

            <Link href={`/matches/${match.id}`}>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer text-xs shadow-xs shadow-amber-500/20"
              >
                Xem Kèo
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
