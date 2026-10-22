'use client'

import { useState } from 'react'
import { deletePricingRule } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

import { toast } from 'sonner'
import { useConfirm } from '@/components/ui/confirm-dialog'
interface PricingRuleActionsProps {
  ruleId: string
  ruleName: string
}

export function PricingRuleActions({ ruleId, ruleName }: PricingRuleActionsProps) {
  const [loading, setLoading] = useState(false)
  const askConfirm = useConfirm()

  async function handleDelete() {
    const ok = await askConfirm({
      title: `Xóa khung giá "${ruleName}"?`,
      description: 'Các đơn đặt mới sẽ dùng giá cơ bản của sân thay cho khung giá này.',
      confirmText: 'Xóa khung giá',
      destructive: true,
    })
    if (!ok) return
    setLoading(true)
    const res = await deletePricingRule(ruleId)
    setLoading(false)
    if (res?.error) toast.error(res.error)
    else toast.success('Đã xóa khung giá')
  }

  return (
    <div>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
          title="Xóa khung giá này"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  )
}
