import { isAllowedMapsHost, isShortMapsLink, parseCoordinates, type LatLng } from '@/lib/maps'

const MAX_REDIRECTS = 5

type FetchLike = (url: string, init: { redirect: 'manual'; signal: AbortSignal; headers: Record<string, string> }) => Promise<{
  status: number
  headers: { get(name: string): string | null }
}>

/**
 * Lấy toạ độ từ thứ chủ sân dán vào: toạ độ thuần, link Google Maps đầy đủ, hoặc link rút gọn (maps.app.goo.gl).
 * Với link rút gọn, đi theo chuỗi chuyển hướng BẰNG TAY và chỉ đi tới host của Google, nên không thể bị lợi dụng để
 * khiến máy chủ gọi tới địa chỉ nội bộ (SSRF). Không tải nội dung trang, chỉ đọc header Location.
 */
export async function resolveCoordinates(input: string, fetchFn: FetchLike = fetch as unknown as FetchLike): Promise<LatLng | null> {
  const direct = parseCoordinates(input)
  if (direct) return direct
  if (!isShortMapsLink(input)) return null

  let url = input.trim()
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (!isAllowedMapsHost(url)) return null

    const res = await fetchFn(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SportArena/1.0)' },
    })

    const location = res.headers.get('location')
    if (res.status < 300 || res.status >= 400 || !location) return null

    const next = new URL(location, url).toString()
    // Toạ độ thường đã nằm ngay trong địa chỉ chuyển hướng, không cần đi tiếp
    const found = parseCoordinates(next)
    if (found) return found
    url = next
  }
  return null
}
