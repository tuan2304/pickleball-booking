'use client'

import { useState } from 'react'
import { deleteClub } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface ClubItemActionsProps {
  clubId: string
  clubName: string
}

export function ClubItemActions({ clubId, clubName }: ClubItemActionsProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (confirm(`Bạn có chắc chắn muốn xóa cụm sân "${clubName}"? Toàn bộ sân con và lịch đặt liên quan sẽ bị xóa.`)) {
      setLoading(true)
      await deleteClub(clubId)
      setLoading(false)
    }
  }

  return (
    <div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
          title="Xóa cụm sân"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  )
}
