'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTicket } from '@/app/actions/support'
import { BODY_MAX, SUBJECT_MAX, TICKET_CATEGORIES } from '@/lib/support'

interface NewTicketFormProps {
  /** Cụm sân của chủ sân để gắn vào yêu cầu (người chơi thì để trống) */
  clubs?: Array<{ id: string; name: string }>
}

export function NewTicketForm({ clubs = [] }: NewTicketFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ subject: '', category: 'other', body: '', clubId: '' })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await createTicket({ ...form, clubId: form.clubId || null })
      if (res.error || !res.ticketId) {
        toast.error(res.error ?? 'Không gửi được yêu cầu')
        return
      }
      toast.success('Đã gửi yêu cầu hỗ trợ', { description: 'Chúng tôi sẽ trả lời ngay khi có thể.' })
      router.push(`/support/${res.ticketId}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="t-category" className="text-xs font-semibold">Vấn đề thuộc nhóm</Label>
          <select
            id="t-category"
            value={form.category}
            onChange={set('category')}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        {clubs.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="t-club" className="text-xs font-semibold">Liên quan tới cụm sân (không bắt buộc)</Label>
            <select
              id="t-club"
              value={form.clubId}
              onChange={set('clubId')}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Không chọn</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="t-subject" className="text-xs font-semibold">Tiêu đề</Label>
        <Input
          id="t-subject"
          value={form.subject}
          onChange={set('subject')}
          maxLength={SUBJECT_MAX}
          required
          placeholder="Ví dụ: Đã chuyển khoản nhưng đơn chưa được xác nhận"
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="t-body" className="text-xs font-semibold">Mô tả chi tiết</Label>
        <textarea
          id="t-body"
          value={form.body}
          onChange={set('body')}
          maxLength={BODY_MAX}
          rows={6}
          required
          placeholder="Bạn gặp vấn đề gì, ở sân nào, vào lúc nào? Nếu liên quan đến thanh toán, hãy ghi số tiền và thời điểm chuyển khoản."
          className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <div className="text-right text-xs text-muted-foreground">{form.body.length}/{BODY_MAX}</div>
      </div>

      <Button type="submit" disabled={pending} className="cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800">
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" aria-hidden />}
        Gửi yêu cầu
      </Button>
    </form>
  )
}
