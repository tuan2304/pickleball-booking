/** Kiểm tra dữ liệu hồ sơ người chơi ở phía server. Giao diện cũng kiểm tra nhưng không thể tin client. */
export const SKILL_LEVELS = [
  { id: 'beginner', label: 'Mới chơi' },
  { id: 'intermediate', label: 'Trung bình' },
  { id: 'advanced', label: 'Khá' },
  { id: 'pro', label: 'Chuyên nghiệp' },
] as const

export type PlayerSkill = (typeof SKILL_LEVELS)[number]['id']

export function skillLabel(id: string | null | undefined): string {
  return SKILL_LEVELS.find((s) => s.id === id)?.label ?? 'Chưa cập nhật'
}

export interface ProfileInput {
  fullName?: string | null
  phone?: string | null
  skillLevel?: string | null
}

export type ProfileResult =
  | { ok: true; value: { fullName: string; phone: string | null; skillLevel: PlayerSkill } }
  | { ok: false; error: string }

/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx; chuẩn hóa về dạng 0xxxxxxxxx. */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s.\-()]/g, '')
  const local = compact.startsWith('+84') ? `0${compact.slice(3)}` : compact.startsWith('84') && compact.length === 11 ? `0${compact.slice(2)}` : compact
  return /^0\d{9}$/.test(local) ? local : null
}

export function validateProfile(input: ProfileInput): ProfileResult {
  const fullName = (input.fullName ?? '').replace(/\s+/g, ' ').trim()
  if (fullName.length < 2 || fullName.length > 60) return { ok: false, error: 'Họ tên phải từ 2 đến 60 ký tự' }
  if (/[<>]/.test(fullName)) return { ok: false, error: 'Họ tên không được chứa ký tự < hoặc >' }

  const rawPhone = (input.phone ?? '').trim()
  let phone: string | null = null
  if (rawPhone) {
    phone = normalizePhone(rawPhone)
    if (!phone) return { ok: false, error: 'Số điện thoại không đúng định dạng (ví dụ 0912345678)' }
  }

  const skill = SKILL_LEVELS.find((s) => s.id === input.skillLevel)
  if (!skill) return { ok: false, error: 'Trình độ không hợp lệ' }

  return { ok: true, value: { fullName, phone, skillLevel: skill.id } }
}
