'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { grantPlan, setFreePlan } from '@/app/actions/admin'

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
