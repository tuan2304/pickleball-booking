import { Linking } from 'react-native'

interface Place {
  latitude?: number | null
  longitude?: number | null
  name?: string | null
  address?: string | null
}

function validCoords(p: Place): boolean {
  const { latitude: lat, longitude: lng } = p
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
}

/** Có toạ độ thì chỉ đường chính xác, chưa ghim thì tìm theo "tên, địa chỉ". */
function directionsUrl(p: Place): string | null {
  const query = validCoords(p)
    ? `${p.latitude},${p.longitude}`
    : [p.name, p.address].map((s) => s?.trim()).filter(Boolean).join(', ')
  return query ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}` : null
}

/** Mở app Google Maps (hoặc trình duyệt nếu chưa cài) để chỉ đường tới sân. */
export async function openDirections(p: Place): Promise<boolean> {
  const url = directionsUrl(p)
  if (!url) return false
  await Linking.openURL(url)
  return true
}
