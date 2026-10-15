'use client'

import { useState } from 'react'
import { deletePricingRule } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface PricingRuleActionsProps {
  ruleId: string
  ruleName: string
}

export function PricingRuleActions({ ruleId, ruleName }: PricingRuleActionsProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (confirm(`Bạn có chắc chắn muốn xóa khung giá "${ruleName}"?`)) {
      setLoading(true)
      await deletePricingRule(ruleId)
      setLoading(false)
    }
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
