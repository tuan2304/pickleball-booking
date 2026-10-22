'use client'

import { useState } from 'react'
import { toggleCourtStatus, deleteCourt } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Power, Trash2, Loader2 } from 'lucide-react'

interface CourtItemActionsProps {
  courtId: string
  isActive: boolean
}

export function CourtItemActions({ courtId, isActive }: CourtItemActionsProps) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await toggleCourtStatus(courtId, !isActive)
    setLoading(false)
  }

  async function handleDelete() {
    if (confirm('Bạn có chắc chắn muốn xóa sân con này? Lịch đặt của sân cũng sẽ bị ảnh hưởng.')) {
      setLoading(true)
      await deleteCourt(courtId)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 pt-2 border-t border-border/40 justify-end">
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggle}
            className={`h-7 px-2 text-xs cursor-pointer ${
              isActive
                ? 'text-amber-700 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10'
                : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10'
            }`}
          >
            <Power className="w-3 h-3 mr-1" />
            {isActive ? 'Tạm ngưng' : 'Kích hoạt'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  )
}
