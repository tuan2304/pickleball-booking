'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploader } from '@/components/ui/image-uploader'
import { updateProfile } from '@/app/actions/profile'
import { setAvatar } from '@/app/actions/images'
import { MAX_AVATAR_BYTES } from '@/lib/image-upload'
import { SKILL_LEVELS } from '@/lib/profile'

interface ProfileFormProps {
  userId: string
  initial: { fullName: string; phone: string; skillLevel: string; avatarUrl: string | null }
}

export function ProfileForm({ userId, initial }: ProfileFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ fullName: initial.fullName, phone: initial.phone, skillLevel: initial.skillLevel })
  const [avatar, setAvatarUrl] = useState<string[]>(initial.avatarUrl ? [initial.avatarUrl] : [])
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleAvatarChange(urls: string[]) {
    const previous = avatar
    setAvatarUrl(urls)
    setSavingAvatar(true)
    const res = await setAvatar(urls[0] ?? null)
    setSavingAvatar(false)
    if (res.error) {
      setAvatarUrl(previous)
      toast.error(res.error)
      return
    }
    toast.success(urls.length ? 'Đã cập nhật ảnh đại diện' : 'Đã gỡ ảnh đại diện')
    router.refresh()
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await updateProfile(form)
      if (res.error) {
        setError(res.error)
        return
      }
      toast.success('Đã lưu hồ sơ')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-6" autoComplete="on">
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Ảnh đại diện</Label>
        <div className="max-w-[220px]">
          <ImageUploader
            bucket="avatars"
            folder={userId}
            value={avatar}
            onChange={handleAvatarChange}
            max={1}
            maxBytes={MAX_AVATAR_BYTES}
            disabled={savingAvatar || pending}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-lg text-xs border bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fullName" className="text-xs font-semibold">Họ và tên</Label>
          <Input id="fullName" name="name" value={form.fullName} onChange={set('fullName')} required minLength={2} maxLength={60} autoComplete="name" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold">Số điện thoại</Label>
          <Input id="phone" name="tel" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="0912345678" autoComplete="tel" />
          <p className="text-xs text-muted-foreground">Chỉ chủ sân nơi bạn đặt sân mới thấy số này, để liên hệ khi cần.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill" className="text-xs font-semibold">Trình độ</Label>
          <select
            id="skill"
            value={form.skillLevel}
            onChange={set('skillLevel')}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs cursor-pointer"
          >
            {SKILL_LEVELS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Hiển thị công khai để người khác ghép kèo cho phù hợp.</p>
        </div>
      </div>

      <Button type="submit" disabled={pending} className="bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer">
        {pending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
        Lưu hồ sơ
      </Button>
    </form>
  )
}
