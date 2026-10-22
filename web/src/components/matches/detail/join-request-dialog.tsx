import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Flame, Loader2 } from 'lucide-react'

interface JoinRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
  onMessageChange: (value: string) => void
  loading: boolean
  onSubmit: () => void
}

export function JoinRequestDialog({
  open,
  onOpenChange,
  message,
  onMessageChange,
  loading,
  onSubmit,
}: JoinRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            Gửi Yêu Cầu Tham Gia Kèo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gửi lời nhắn cho chủ kèo về trình độ của bạn hoặc lời chào giao lưu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="joinMsg" className="text-xs font-semibold">
              Lời nhắn gửi chủ kèo (tùy chọn)
            </Label>
            <Input
              id="joinMsg"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Ví dụ: Mình đánh cầu được 1 năm, cho mình xin 1 slot nhé..."
              className="text-xs"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">Quy định giao lưu:</div>
            <div>• Có mặt đúng giờ đã hẹn tại cụm sân.</div>
            <div>• Mang trang phục thể thao và vợt/giày phù hợp.</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer text-xs"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={onSubmit}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold cursor-pointer text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi Yêu Cầu'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
