'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, MapPin } from 'lucide-react'

const SPORTS = [
  { id: 'all', label: 'Tất cả môn' },
  { id: 'football', label: '⚽ Bóng đá' },
  { id: 'badminton', label: '🏸 Cầu lông' },
  { id: 'pickleball', label: '🏓 Pickleball' },
  { id: 'tennis', label: '🎾 Tennis' },
  { id: 'basketball', label: '🏀 Bóng rổ' },
]

const DISTRICTS = [
  'Tất cả khu vực',
  'Quận 1',
  'Quận 3',
  'Quận 7',
  'Quận 10',
  'Tân Bình',
  'Bình Thạnh',
  'Thủ Đức',
  'Gò Vấp',
]

export function ClubFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSport = searchParams.get('sport') || 'all'
  const currentDistrict = searchParams.get('district') || 'Tất cả khu vực'
  const currentQuery = searchParams.get('q') || ''

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all' && value !== 'Tất cả khu vực') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/clubs?${params.toString()}`)
  }

  return (
    <div className="space-y-4 bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-sm">
      {/* Top search & district */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            defaultValue={currentQuery}
            onChange={(e) => updateParams('q', e.target.value)}
            placeholder="Tìm theo tên sân, đường phố hoặc quận..."
            className="pl-9 h-10 bg-muted/30 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <select
            value={currentDistrict}
            onChange={(e) => updateParams('district', e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-48 cursor-pointer"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
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
                  ? 'bg-emerald-600 text-white shadow-xs font-bold shadow-emerald-600/20'
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
