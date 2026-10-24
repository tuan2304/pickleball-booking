/**
 * Phần thuần túy của API cho ứng dụng mobile: tách token khỏi header và kiểm tra thân yêu cầu.
 * Mobile gọi API này vì ghi vào bảng đặt sân bị khóa với người dùng, mọi thao tác ghi phải qua server.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MAX_BODY_BYTES = 4 * 1024
export const MAX_NOTE_LENGTH = 500

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/** Lấy token từ "Authorization: Bearer <token>"; null nếu thiếu hoặc sai dạng. */
export function bearerToken(header: string | null | undefined): string | null {
  const match = /^Bearer\s+([A-Za-z0-9\-._~+/]+=*)$/.exec(header?.trim() ?? '')
  return match ? match[1] : null
}

export interface CreateBookingBody {
  courtId: string
  startTime: string
  endTime: string
  note?: string
}

export type ParsedBody<T> = { ok: true; value: T } | { ok: false; error: string }

function isIsoInstant(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(new Date(value).getTime())
}

export function parseCreateBookingBody(body: unknown): ParsedBody<CreateBookingBody> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }
  }
  const { courtId, startTime, endTime, note } = body as Record<string, unknown>

  if (!isUuid(courtId)) return { ok: false, error: 'Mã sân không hợp lệ' }
  if (!isIsoInstant(startTime) || !isIsoInstant(endTime)) return { ok: false, error: 'Thời gian đặt sân không hợp lệ' }
  if (note !== undefined && (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH)) {
    return { ok: false, error: `Ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự` }
  }

  return { ok: true, value: { courtId, startTime, endTime, ...(note ? { note } : {}) } }
}
