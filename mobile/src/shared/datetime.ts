/** Mọi tính toán nghiệp vụ (giá, giờ mở cửa) đều theo giờ Việt Nam, không phụ thuộc múi giờ của server/trình duyệt. */
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh'
/** Việt Nam không có giờ mùa hè nên độ lệch cố định */
const VN_OFFSET = '+07:00'

// Việt Nam cố định UTC+7 (không có giờ mùa hè) nên chỉ cần cộng 7 giờ rồi đọc theo UTC. Cách này không phụ thuộc
// Intl/múi giờ của máy: chạy giống hệt trên server Node, trình duyệt và Hermes (ứng dụng mobile).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

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
  const d = new Date(date.getTime() + VN_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hour = d.getUTCHours()
  const minute = d.getUTCMinutes()
  return {
    dayOfWeek: d.getUTCDay(),
    dateKey: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(hour)}:${pad(minute)}:${pad(d.getUTCSeconds())}`,
    minutesOfDay: hour * 60 + minute,
  }
}

/** Ngày (yyyy-mm-dd) theo giờ VN của một thời điểm. Khác `toISOString()` vốn trả về ngày UTC. */
export function vnDateKey(at: Date | number): string {
  return getVnParts(at instanceof Date ? at : new Date(at)).dateKey
}

/** Cộng/trừ ngày trên chuỗi yyyy-mm-dd */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Thời điểm tuyệt đối ứng với `hour:minute` của ngày `dateKey` theo giờ VN. */
export function vnDateTime(dateKey: string, hour: number, minute = 0): Date {
  const hh = String(Math.floor(hour)).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return new Date(`${dateKey}T${hh}:${mm}:00${VN_OFFSET}`)
}
