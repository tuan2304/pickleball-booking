'use client'

import { useState } from 'react'
import { createCourt } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

interface CourtFormModalProps {
  clubId: string
  clubName: string
}

export function CourtFormModal({ clubId, clubName }: CourtFormModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('clubId', clubId)

    const result = await createCourt(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Thêm Sân Con
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Thêm Sân Con</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Thêm sân con thuộc cụm: <strong>{clubName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="courtName">Tên / Số sân *</Label>
            <Input
              id="courtName"
              name="name"
              placeholder="Sân 1 (Sân 7 người)"
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sportType">Bộ môn thể thao *</Label>
            <select
              id="sportType"
              name="sportType"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="football">Bóng đá mini</option>
              <option value="badminton">Cầu lông</option>
              <option value="pickleball">Pickleball</option>
              <option value="tennis">Tennis</option>
              <option value="basketball">Bóng rổ</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="surfaceType">Loại mặt sân</Label>
            <Input
              id="surfaceType"
              name="surfaceType"
              placeholder="Cỏ nhân tạo / Thảm cao su / Sàn gỗ"
              defaultValue="Cỏ nhân tạo"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="basePrice">Giá cơ bản (đ/giờ) *</Label>
              <Input
                id="basePrice"
                name="basePricePerHour"
                type="number"
                min="0"
                step="10000"
                defaultValue="200000"
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depositPercentage">Mức cọc (%) *</Label>
              <Input
                id="depositPercentage"
                name="depositPercentage"
                type="number"
                min="0"
                max="100"
                defaultValue="30"
                required
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                'Thêm Sân Con'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
