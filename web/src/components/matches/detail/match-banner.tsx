import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin } from 'lucide-react'
import { sportLabel, skillInfo } from '@/lib/constants'
import { SportIcon } from '@/components/ui/sport-icon'
import { formatTime, formatLongDate } from '@/lib/format'
import type { MatchDetail } from './types'

interface MatchBannerProps {
  match: MatchDetail
  isFull: boolean
  slotsLeft: number
}

/** Thẻ đầu trang: môn, trình độ, trạng thái chỗ trống, thời gian và địa điểm. */
export function MatchBanner({ match, isFull, slotsLeft }: MatchBannerProps) {
  const skill = skillInfo(match.skill_level)
  const court = match.booking?.court
  const club = court?.club
  const startTime = match.booking?.start_time ? new Date(match.booking.start_time) : null
  const endTime = match.booking?.end_time ? new Date(match.booking.end_time) : null

  return (
    <Card className="border-border shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold py-1 px-2.5 bg-background">
              <SportIcon sport={match.sport_type} className="w-3.5 h-3.5 mr-1" />
              {sportLabel(match.sport_type)}
            </Badge>
            <Badge variant="outline" className={`text-xs font-semibold py-1 px-2.5 ${skill.badge}`}>
              {skill.longLabel}
            </Badge>
          </div>

          <Badge
            variant="outline"
            className={
              match.status === 'cancelled'
                ? 'bg-red-500/10 text-red-600 border-red-500/30 text-xs font-bold'
                : isFull
                ? 'bg-muted text-muted-foreground border-border text-xs'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-bold'
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
            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Thời Gian Thi Đấu
            </div>
            <div className="font-bold text-sm text-foreground">
              {startTime && endTime
                ? `${formatTime(startTime)} - ${formatTime(endTime)}`
                : 'Thỏa thuận'}
            </div>
            <div className="text-xs text-muted-foreground">
              {startTime && formatLongDate(startTime)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
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
  )
}
