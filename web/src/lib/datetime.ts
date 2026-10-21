/** Mọi tính toán nghiệp vụ (giá, giờ mở cửa) đều theo giờ Việt Nam, không phụ thuộc múi giờ của server. */
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh'

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const vnFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: VN_TIMEZONE,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export interface VnParts {
  /** 0 = Chủ nhật ... 6 = Thứ bảy */
  dayOfWeek: number
  /** yyyy-mm-dd theo giờ VN */
  dateKey: string
  /** HH:MM:SS theo giờ VN, so sánh chuỗi được với cột TIME của Postgres */
  time: string
  minutesOfDay: number
}

export function getVnParts(date: Date): VnParts {
  const parts: Record<string, string> = {}
  for (const p of vnFormatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  const hour = parts.hour === '24' ? '00' : parts.hour
  return {
    dayOfWeek: WEEKDAY_INDEX[parts.weekday] ?? 0,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}:${parts.second}`,
    minutesOfDay: Number(hour) * 60 + Number(parts.minute),
  }
}
