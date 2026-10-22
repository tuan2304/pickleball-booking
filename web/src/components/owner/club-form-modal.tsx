'use client'

import { useState } from 'react'
import { createClub } from '@/app/actions/owner'
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
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { LocationPicker } from '@/components/maps/location-picker'

export function ClubFormModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await createClub(formData)

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
        onClick={() => setOpen(true)}
        className="bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-sm"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Thêm Cụm Sân Mới
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Thêm Cụm Sân Thể Thao</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Nhập thông tin cơ bản về cơ sở/cụm sân của bạn
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Tên cụm sân *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Sân Bóng Đá & Cầu Lông Chuyên Nghiệp"
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Địa chỉ chi tiết *</Label>
            <Input
              id="address"
              name="address"
              placeholder="123 Đường Số 1, Phường Tân Phú"
              required
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="district">Quận / Huyện</Label>
              <Input
                id="district"
                name="district"
                placeholder="Quận 7"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Tỉnh / Thành phố</Label>
              <Input
                id="city"
                name="city"
                defaultValue="Hồ Chí Minh"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="openTime">Giờ mở cửa</Label>
              <Input
                id="openTime"
                name="openTime"
                type="time"
                defaultValue="06:00"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closeTime">Giờ đóng cửa</Label>
              <Input
                id="closeTime"
                name="closeTime"
                type="time"
                defaultValue="23:00"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label>Vị trí trên bản đồ (nên ghim để khách chỉ đường chính xác)</Label>
            <LocationPicker />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amenities">Tiện ích (cách nhau bởi dấu phẩy)</Label>
            <Input
              id="amenities"
              name="amenities"
              placeholder="wifi, bãi xe ô tô, tắm nóng lạnh, nước uống"
              className="h-9"
            />
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
              className="bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Tạo Cụm Sân'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
