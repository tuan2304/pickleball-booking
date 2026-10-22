import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Flame } from 'lucide-react'
import { MATCH_SKILL_IDS, SKILL_LEVELS, type MatchSkillId } from '@/lib/constants'
import { formatNumber } from '@/lib/format'
import type { MatchDraft } from './types'

interface MatchOptionsProps {
  draft: MatchDraft
  totalPrice: number
  onChange: (patch: Partial<MatchDraft>) => void
}

const PLAYER_COUNTS = [2, 3, 4, 6, 8, 10, 12, 14]

/** Công tắc "mở ghép kèo" + form cấu hình kèo, hiện ngay trong lúc đặt sân. */
export function MatchOptions({ draft, totalPrice, onChange }: MatchOptionsProps) {
  const { enabled, title, requiredPlayers, skillLevel, costSharingType } = draft

  return (
    <div className="pt-2 border-t border-border/60">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => onChange({ enabled: !enabled })}
        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between ${
          enabled
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-300'
            : 'bg-muted/40 border-border hover:bg-muted/70 text-foreground'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${enabled ? 'bg-amber-400 text-slate-900' : 'bg-muted text-muted-foreground'}`}>
            <Flame className="w-4 h-4" aria-hidden />
          </span>
          <span>
            <span className="block text-xs font-bold leading-tight">Mở Ghép Kèo Giao Lưu</span>
            <span className="block text-xs text-muted-foreground">Tuyển thêm người chơi chung</span>
          </span>
        </span>
        <Badge
          variant={enabled ? 'default' : 'outline'}
          className={enabled ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs' : 'text-xs'}
        >
          {enabled ? 'Đang Bật' : 'Bấm để bật'}
        </Badge>
      </button>

      {enabled && (
        <div className="mt-3 p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="matchTitle" className="text-xs font-semibold text-foreground">
              Tiêu đề bài đăng ghép kèo
            </Label>
            <Input
              id="matchTitle"
              value={title}
              maxLength={100}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={`Ví dụ: Tuyển ${Math.max(1, requiredPlayers - 1)} bạn giao lưu vui vẻ`}
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="matchPlayers" className="text-xs font-semibold text-foreground">
                Tổng số người cần
              </Label>
              <select
                id="matchPlayers"
                value={requiredPlayers}
                onChange={(e) => onChange({ requiredPlayers: Number(e.target.value) })}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground"
              >
                {PLAYER_COUNTS.map((num) => (
                  <option key={num} value={num}>
                    {num} người ({num - 1} slot trống)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="matchSkill" className="text-xs font-semibold text-foreground">
                Trình độ yêu cầu
              </Label>
              <select
                id="matchSkill"
                value={skillLevel}
                onChange={(e) => onChange({ skillLevel: e.target.value as MatchSkillId })}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground"
              >
                {MATCH_SKILL_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SKILL_LEVELS[id].longLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Hình thức chia tiền sân</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={costSharingType === 'split'}
                onClick={() => onChange({ costSharingType: 'split' })}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  costSharingType === 'split'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Chia đều tiền
              </button>
              <button
                type="button"
                aria-pressed={costSharingType === 'host_covers'}
                onClick={() => onChange({ costSharingType: 'host_covers' })}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  costSharingType === 'host_covers'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Chủ bao trọn (0đ)
              </button>
            </div>

            {costSharingType === 'split' && (
              <div className="text-xs text-muted-foreground pt-1 flex justify-between items-center">
                <span>Gợi ý mỗi người đóng:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatNumber(Math.round(totalPrice / Math.max(1, requiredPlayers)))} đ/người
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
