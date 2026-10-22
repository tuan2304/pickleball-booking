'use client'

import { useState } from 'react'
import { toggleCourtStatus, deleteCourt } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Power, Trash2, Loader2 } from 'lucide-react'

import { toast } from 'sonner'
import { useConfirm } from '@/components/ui/confirm-dialog'
interface CourtItemActionsProps {
  courtId: string
  isActive: boolean
}

export function CourtItemActions({ courtId, isActive }: CourtItemActionsProps) {
  const [loading, setLoading] = useState(false)
  const askConfirm = useConfirm()

  async function handleToggle() {
    setLoading(true)
    const res = await toggleCourtStatus(courtId, !isActive)
    setLoading(false)
    if (res?.error) toast.error(res.error)
    else toast.success(isActive ? 'Đã tạm ngưng sân' : 'Đã kích hoạt sân')
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Xóa sân con này?',
      description: 'Chỉ xóa được sân chưa có đơn đặt nào. Nếu đã có, hãy chọn Tạm ngưng.',
      confirmText: 'Xóa sân',
      destructive: true,
    })
    if (!ok) return
    setLoading(true)
    const res = await deleteCourt(courtId)
    setLoading(false)
    if (res?.error) toast.error(res.error)
    else toast.success('Đã xóa sân con')
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
                ? 'text-amber-700 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10'
                : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <Power className="w-3 h-3 mr-1" />
            {isActive ? 'Tạm ngưng' : 'Kích hoạt'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  )
}
