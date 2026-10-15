'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, Flame, Users, Sparkles } from 'lucide-react'

const SPORTS = [
  { id: 'all', label: 'Tất cả môn' },
  { id: 'football', label: '⚽ Bóng đá' },
  { id: 'badminton', label: '🏸 Cầu lông' },
  { id: 'pickleball', label: '🏓 Pickleball' },
  { id: 'tennis', label: '🎾 Tennis' },
  { id: 'basketball', label: '🏀 Bóng rổ' },
]

const SKILL_LEVELS = [
  { id: 'all', label: 'Tất cả trình độ' },
  { id: 'beginner', label: 'Mới chơi' },
  { id: 'intermediate', label: 'Trung bình' },
  { id: 'advanced', label: 'Bán chuyên' },
]

const COST_TYPES = [
  { id: 'all', label: 'Tất cả chi phí' },
  { id: 'split', label: 'Chia đều' },
  { id: 'host_covers', label: 'Chủ bao trọn (0đ)' },
]

export function MatchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSport = searchParams.get('sport') || 'all'
  const currentSkill = searchParams.get('skill') || 'all'
  const currentCost = searchParams.get('cost') || 'all'
  const currentQuery = searchParams.get('q') || ''

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/matches?${params.toString()}`)
  }

  return (
    <div className="space-y-4 bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-sm">
      {/* Top search & dropdowns */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            defaultValue={currentQuery}
            onChange={(e) => updateParams('q', e.target.value)}
            placeholder="Tìm theo tiêu đề kèo, khu vực hoặc tên sân..."
            className="pl-9 h-10 bg-muted/30 focus-visible:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Skill Filter */}
          <select
            value={currentSkill}
            onChange={(e) => updateParams('skill', e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-40 cursor-pointer"
          >
            {SKILL_LEVELS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Cost Filter */}
          <select
            value={currentCost}
            onChange={(e) => updateParams('cost', e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-44 cursor-pointer"
          >
            {COST_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
        {SPORTS.map((sport) => {
          const isActive = currentSport === sport.id
          return (
            <button
              key={sport.id}
              type="button"
              onClick={() => updateParams('sport', sport.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-xs font-bold shadow-amber-500/20'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              }`}
            >
              {sport.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
