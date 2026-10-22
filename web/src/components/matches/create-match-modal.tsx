'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMatch } from '@/app/actions/matches'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Flame, Loader2, AlertCircle } from 'lucide-react'

import { MATCH_SKILL_IDS, SKILL_LEVELS, type MatchSkillId } from '@/lib/constants'
import { formatNumber, formatVnd } from '@/lib/format'
interface CreateMatchModalProps {
  bookingId: string
  courtName: string
  clubName: string
  totalPrice: number
  sportType: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMatchModal({
  bookingId,
  courtName,
  clubName,
  totalPrice,
  sportType,
  open,
  onOpenChange,
}: CreateMatchModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState(`Tuyển người chơi tại ${courtName} - ${clubName}`)
  const [description, setDescription] = useState('')
  const [skillLevel, setSkillLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [requiredPlayers, setRequiredPlayers] = useState<number>(4)
  const [costSharingType, setCostSharingType] = useState<'split' | 'host_covers'>('split')
  const [customCost] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestedCost = Math.round(totalPrice / Math.max(1, requiredPlayers))
  const effectiveCost =
    costSharingType === 'host_covers'
      ? 0
      : customCost
      ? Number(customCost)
      : suggestedCost

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề kèo')
      return
    }

    setLoading(true)
    setError(null)

    const res = await createMatch({
      bookingId,
      title: title.trim(),
      description: description.trim() || undefined,
      sportType,
      skillLevel,
      requiredPlayers,
      costSharingType,
      costPerPerson: effectiveCost,
    })

    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.matchId) {
      onOpenChange(false)
      router.push(`/matches/${res.matchId}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Flame className="w-4 h-4 text-amber-500" />
            Mở Ghép Kèo Cho Sân Đã Đặt
          </DialogTitle>
          <DialogDescription className="text-xs">
            {clubName} ({courtName}) • Tổng tiền sân: {formatVnd(totalPrice)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="matchTitle" className="text-xs font-semibold">
              Tiêu đề bài đăng kèo
            </Label>
            <Input
              id="matchTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Cần 2 bạn giao lưu cầu lông vui vẻ..."
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="matchDesc" className="text-xs font-semibold">
              Mô tả thêm / Ghi chú (tùy chọn)
            </Label>
            <Input
              id="matchDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Trình độ trung bình, mang vợt theo..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tổng số người cần</Label>
              <select
                value={requiredPlayers}
                onChange={(e) => setRequiredPlayers(Number(e.target.value))}
                className="w-full h-9 text-xs rounded-md border border-input bg-background px-3 py-1 text-foreground"
              >
                {[2, 3, 4, 6, 8, 10, 12, 14].map((num) => (
                  <option key={num} value={num}>
                    {num} người ({num - 1} slot trống)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Trình độ yêu cầu</Label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as MatchSkillId)}
                className="w-full h-9 text-xs rounded-md border border-input bg-background px-3 py-1 text-foreground"
              >
                {MATCH_SKILL_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SKILL_LEVELS[id].longLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Hình thức chia tiền sân</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCostSharingType('split')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  costSharingType === 'split'
                    ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Chia đều tiền sân
              </button>
              <button
                type="button"
                onClick={() => setCostSharingType('host_covers')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  costSharingType === 'host_covers'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Chủ bao trọn (0đ)
              </button>
            </div>

            {costSharingType === 'split' && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                <span>Gợi ý mỗi người đóng:</span>
                <span className="font-bold text-xs">
                  {formatNumber(suggestedCost)} đ/người
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold cursor-pointer text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo & Mở Ghép Kèo'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
