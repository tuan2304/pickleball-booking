import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Flame, ShieldCheck, CheckCircle2, LogOut, Hourglass } from 'lucide-react'
import { formatVnd } from '@/lib/format'
import type { MatchDetail, MatchParticipantItem } from './types'

interface MatchActionPanelProps {
  match: MatchDetail
  currentUserId: string | null
  isHost: boolean
  isFull: boolean
  userParticipant: MatchParticipantItem | undefined
  loading: boolean
  onJoinClick: () => void
  onLeave: () => void
  onCancelMatch: () => void
}

/** Cột phải: chi phí mỗi người và nút hành động phù hợp với vai trò của người xem. */
export function MatchActionPanel({
  match,
  currentUserId,
  isHost,
  isFull,
  userParticipant,
  loading,
  onJoinClick,
  onLeave,
  onCancelMatch,
}: MatchActionPanelProps) {
  return (
    <Card className="border-border shadow-sm sticky top-24">
      <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
        <CardTitle className="text-base font-bold text-foreground">
          Chi Phí & Tham Gia
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Cost Box */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            Hình thức chia tiền sân:
          </div>
          <div className="text-sm font-bold text-foreground">
            {match.cost_sharing_type === 'host_covers'
              ? 'Chủ sân bao trọn (0đ)'
              : 'Chia đều theo số người'}
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Số tiền mỗi người:</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-400">
              {match.cost_sharing_type === 'host_covers'
                ? 'Miễn phí'
                : `${formatVnd(match.cost_per_person || 0)}`}
            </span>
          </div>
        </div>

        {/* Status & CTA Controls */}
        <div className="space-y-3 pt-2">
          {!currentUserId ? (
            <Link href={`/login?next=/matches/${match.id}`} className="block">
              <Button className="w-full h-10 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold cursor-pointer text-xs sm:text-sm">
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
                  onClick={onCancelMatch}
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
                  <Hourglass className="w-4 h-4 inline -mt-0.5 mr-1" aria-hidden />Yêu cầu của bạn đang chờ chủ kèo duyệt
                </div>
              )}
              {userParticipant.status === 'accepted' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
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
                  onClick={onLeave}
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
              onClick={onJoinClick}
              className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold cursor-pointer text-sm shadow-md shadow-amber-500/20"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              Xin Tham Gia Kèo Này
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          Chủ kèo sẽ liên hệ và duyệt bạn vào nhóm thi đấu
        </div>
      </CardContent>
    </Card>
  )
}
