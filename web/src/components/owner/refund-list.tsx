'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { markBookingRefunded } from '@/app/actions/cancellation'
import { formatDate, formatTime, formatVnd } from '@/lib/format'

export interface RefundRow {
  id: string
  clubName: string
  courtName: string
  start_time: string
  end_time: string
  refund_amount: number
  refund_status: 'pending' | 'refunded'
  cancelled_by: string | null
  refunded_at: string | null
  customerName: string
  customerPhone: string | null
}

export function RefundList({ rows }: { rows: RefundRow[] }) {
  const router = useRouter()
  const askConfirm = useConfirm()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleRefunded(row: RefundRow) {
    const ok = await askConfirm({
      title: 'Xác nhận đã hoàn cọc?',
      description: `Bạn đã chuyển ${formatVnd(row.refund_amount)} cho ${row.customerName}? Khách sẽ nhận thông báo và không thể hoàn tác.`,
      confirmText: 'Đã hoàn cọc',
      cancelText: 'Chưa',
    })
    if (!ok) return
    setBusyId(row.id)
    startTransition(async () => {
      const res = await markBookingRefunded(row.id)
      setBusyId(null)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Đã ghi nhận hoàn cọc')
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Chưa có khoản hoàn cọc nào.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id} className="shadow-xs">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-foreground">{row.customerName}</span>
                {row.refund_status === 'pending' ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Chờ hoàn cọc</Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Đã hoàn</Badge>
                )}
                <span className="text-muted-foreground">{row.cancelled_by === 'owner' ? 'Bạn hủy đơn' : 'Khách hủy trong hạn miễn phí'}</span>
              </div>
              <div className="text-muted-foreground">
                {row.clubName} • {row.courtName} • {formatTime(row.start_time)} - {formatTime(row.end_time)} ({formatDate(row.start_time)})
              </div>
              {row.customerPhone ? (
                <a href={`tel:${row.customerPhone}`} className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 underline underline-offset-2">
                  <Phone className="w-3 h-3" aria-hidden /> {row.customerPhone}
                </a>
              ) : (
                <span className="text-muted-foreground">Khách chưa cung cấp số điện thoại</span>
              )}
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Số tiền hoàn</div>
                <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">{formatVnd(row.refund_amount)}</div>
              </div>
              {row.refund_status === 'pending' && (
                <Button
                  size="sm"
                  disabled={pending && busyId === row.id}
                  onClick={() => handleRefunded(row)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  {pending && busyId === row.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" aria-hidden />}
                  Đã hoàn cọc
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
