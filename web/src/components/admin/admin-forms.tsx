'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { grantPlan, recordPayout, setFreePlan } from '@/app/actions/admin'

export function PayoutForm({ clubId, owed }: { clubId: string; owed: number }) {
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState(owed > 0 ? String(owed) : '')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const res = await recordPayout(clubId, Number(amount), note)
      setMessage(res.error ?? 'Đã ghi nhận')
      if (res.success) setNote('')
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Số tiền đã chuyển"
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8 w-32 text-xs"
        required
      />
      <Input aria-label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (mã giao dịch...)" className="h-8 w-48 text-xs" />
      <Button type="submit" size="sm" disabled={pending || owed <= 0} className="cursor-pointer">
        Ghi nhận đã chuyển
      </Button>
      {message && <span role="status" className="text-xs text-muted-foreground">{message}</span>}
    </form>
  )
}

export function PlanActions({ clubId }: { clubId: string }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string; success?: boolean }>) =>
    startTransition(async () => {
      const res = await fn()
      setMessage(res.error ?? 'Đã cập nhật')
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => grantPlan(clubId, 1))} className="cursor-pointer">
        +1 tháng Pro
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => grantPlan(clubId, 12))} className="cursor-pointer">
        +12 tháng
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setFreePlan(clubId))} className="cursor-pointer">
        Về Free
      </Button>
      {message && <span role="status" className="text-xs text-muted-foreground">{message}</span>}
    </div>
  )
}
