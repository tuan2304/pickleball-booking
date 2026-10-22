/**
 * Tiện ích Google Maps dùng chung cho web (server + client). Không cần API key để chỉ đường / mở bản đồ;
 * bản đồ nhúng dùng Maps Embed API nếu có NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, nếu không rơi về dạng nhúng không cần khóa.
 */

export interface LatLng {
  lat: number
  lng: number
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    // (0, 0) là giá trị mặc định khi chưa có dữ liệu, không phải một địa điểm thật
    !(lat === 0 && lng === 0)
  )
}

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`

function pair(lat: string, lng: string): LatLng | null {
  const a = Number(lat)
  const b = Number(lng)
  return isValidLatLng(a, b) ? { lat: a, lng: b } : null
}

/**
 * Lấy toạ độ từ: "10.7769, 106.7009", hoặc link Google Maps dạng
 * .../@10.77,106.70,17z, .../data=!3d10.77!4d106.70 (vị trí chính xác của địa điểm, ưu tiên hơn @),
 * ?q=10.77,106.70, ?ll=..., ?query=..., ?destination=...
 */
export function parseCoordinates(input: string): LatLng | null {
  const text = decodeURIComponent(input.trim().replace(/%(?![0-9a-f]{2})/gi, '%25'))
  if (!text) return null

  // Cặp toạ độ thuần: "10.7769, 106.7009" (chấp nhận khoảng trắng, dấu °, dấu ; hoặc tab)
  const plain = text.match(new RegExp(String.raw`^\(?\s*(${NUM})\s*°?\s*[,;\s]\s*(${NUM})\s*°?\s*\)?$`))
  if (plain) return pair(plain[1], plain[2])

  // !3d<lat>!4d<lng>: toạ độ của chính địa điểm được ghim (chính xác hơn tâm khung nhìn trong @)
  const place = text.match(new RegExp(String.raw`!3d(${NUM})!4d(${NUM})`))
  if (place) return pair(place[1], place[2])

  // ?q=lat,lng  &ll=lat,lng  &query=lat,lng  &destination=lat,lng  &center=lat,lng
  const query = text.match(new RegExp(String.raw`[?&](?:q|ll|query|destination|center|daddr)=\+?(${NUM})\s*,\s*\+?(${NUM})`))
  if (query) return pair(query[1], query[2])

  // /@lat,lng,zoom
  const at = text.match(new RegExp(String.raw`/@(${NUM}),(${NUM})`))
  if (at) return pair(at[1], at[2])

  return null
}

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl']

/** Link rút gọn của Google Maps (cần được mở rộng ở server để biết toạ độ). */
export function isShortMapsLink(input: string): boolean {
  try {
    const u = new URL(input.trim())
    return u.protocol === 'https:' && SHORT_LINK_HOSTS.includes(u.hostname)
  } catch {
    return false
  }
}

/** Các host được phép khi đi theo chuỗi chuyển hướng của link rút gọn (chống SSRF). */
const ALLOWED_REDIRECT_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com', 'maps.google.com']

export function isAllowedMapsHost(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && ALLOWED_REDIRECT_HOSTS.includes(u.hostname)
  } catch {
    return false
  }
}

export interface PlaceRef {
  lat?: number | null
  lng?: number | null
  address?: string | null
  name?: string | null
}

export function hasCoordinates(p: PlaceRef): p is PlaceRef & LatLng {
  return typeof p.lat === 'number' && typeof p.lng === 'number' && isValidLatLng(p.lat, p.lng)
}

/** Chuỗi truy vấn: ưu tiên toạ độ (chính xác), nếu chưa ghim thì dùng "tên, địa chỉ". */
function queryFor(p: PlaceRef): string | null {
  if (hasCoordinates(p)) return `${p.lat},${p.lng}`
  const text = [p.name, p.address].map((s) => s?.trim()).filter(Boolean).join(', ')
  return text || null
}

/** Địa chỉ đầy đủ của cụm sân để hiển thị và tìm trên bản đồ. */
export function fullAddress(club: { address?: string | null; ward?: string | null; district?: string | null; city?: string | null }): string {
  return [club.address, club.ward, club.district, club.city].map((s) => s?.trim()).filter(Boolean).join(', ')
}

/** URL của iframe bản đồ nhúng. Trả null nếu không có gì để hiển thị. */
export function buildEmbedUrl(place: PlaceRef, apiKey?: string | null): string | null {
  const q = queryFor(place)
  if (!q) return null
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&zoom=17`
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=17&output=embed`
}

/** Mở địa điểm trong Google Maps (app trên điện thoại hoặc web). */
export function buildViewUrl(place: PlaceRef): string | null {
  const q = queryFor(place)
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

/** Chỉ đường từ vị trí hiện tại của khách tới sân. */
export function buildDirectionsUrl(place: PlaceRef): string | null {
  const q = queryFor(place)
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null
}
