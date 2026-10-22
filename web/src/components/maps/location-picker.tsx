'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, ExternalLink, Link2, Loader2, LocateFixed, X } from 'lucide-react'
import { resolveMapsInput } from '@/app/actions/maps'
import { buildViewUrl, isValidLatLng, type LatLng } from '@/lib/maps'
import { MapEmbed } from '@/components/maps/map-embed'

interface LocationPickerProps {
  initial?: LatLng | null
  /** Địa chỉ/tên để xem trước bản đồ khi chưa có toạ độ và để mở đúng khu vực trong Google Maps */
  address?: string
  name?: string
  onChange?: (value: LatLng | null) => void
}

/**
 * Chọn vị trí sân: dán link Google Maps / toạ độ, hoặc dùng vị trí hiện tại.
 * Luôn render 2 input ẩn `latitude` và `longitude` nên dùng được bên trong <form> thường.
 */
export function LocationPicker({ initial = null, address, name, onChange }: LocationPickerProps) {
  const [coords, setCoords] = useState<LatLng | null>(initial)
  const [text, setText] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [locating, setLocating] = useState(false)

  function update(next: LatLng | null) {
    setCoords(next)
    onChange?.(next)
  }

  function resolveFromText() {
    setMessage(null)
    startTransition(async () => {
      const res = await resolveMapsInput(text)
      if (res.error || res.lat === undefined || res.lng === undefined) {
        setMessage({ type: 'error', text: res.error ?? 'Không đọc được toạ độ' })
        return
      }
      update({ lat: res.lat, lng: res.lng })
      setMessage({ type: 'success', text: 'Đã ghim vị trí. Kiểm tra bản đồ bên dưới đã đúng chỗ chưa.' })
    })
  }

  function useMyLocation() {
    setMessage(null)
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Trình duyệt không hỗ trợ định vị.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const next = { lat: Number(pos.coords.latitude.toFixed(7)), lng: Number(pos.coords.longitude.toFixed(7)) }
        if (!isValidLatLng(next.lat, next.lng)) {
          setMessage({ type: 'error', text: 'Không lấy được vị trí hợp lệ.' })
          return
        }
        update(next)
        setMessage({ type: 'success', text: 'Đã lấy vị trí hiện tại. Hãy chắc chắn bạn đang đứng tại sân.' })
      },
      () => {
        setLocating(false)
        setMessage({ type: 'error', text: 'Không lấy được vị trí. Hãy cho phép truy cập vị trí trên trình duyệt, hoặc dán link Google Maps.' })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const openUrl = buildViewUrl({ name, address }) ?? 'https://www.google.com/maps'

  return (
    <div className="space-y-3">
      <input type="hidden" name="latitude" value={coords?.lat ?? ''} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ''} />

      <div className="space-y-1.5">
        <Label htmlFor="mapsLink" className="text-xs font-semibold">
          Dán link Google Maps hoặc toạ độ của sân
        </Label>
        <div className="flex gap-2">
          <Input
            id="mapsLink"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (text.trim()) resolveFromText()
              }
            }}
            placeholder="https://maps.app.goo.gl/... hoặc 10.7769, 106.7009"
            className="h-9 text-xs"
          />
          <Button type="button" onClick={resolveFromText} disabled={pending || !text.trim()} className="h-9 shrink-0 cursor-pointer">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4 mr-1" aria-hidden />}
            Ghim
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Mở{' '}
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="underline text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
            Google Maps <ExternalLink className="w-3 h-3" aria-hidden />
          </a>
          , tìm sân của bạn, bấm <b>Chia sẻ → Sao chép liên kết</b> rồi dán vào đây.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating} className="cursor-pointer">
          {locating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 mr-1" aria-hidden />}
          Dùng vị trí hiện tại của tôi
        </Button>
        {coords && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { update(null); setMessage(null) }} className="cursor-pointer">
            <X className="w-3.5 h-3.5 mr-1" aria-hidden />
            Xóa vị trí
          </Button>
        )}
      </div>

      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
            message.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          {message.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> : <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-border">
        <MapEmbed place={{ lat: coords?.lat, lng: coords?.lng, address, name }} title="Xem trước vị trí sân" className="h-52" />
      </div>
      <p className="text-xs text-muted-foreground">
        {coords
          ? `Đã ghim: ${coords.lat}, ${coords.lng}`
          : address
          ? 'Chưa ghim vị trí chính xác: khách sẽ thấy bản đồ tìm theo địa chỉ, có thể lệch. Hãy ghim để chỉ đường chính xác.'
          : 'Chưa có vị trí.'}
      </p>
    </div>
  )
}
