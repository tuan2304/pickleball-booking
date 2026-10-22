import { describe, expect, it } from 'vitest'
import { validateAnnouncement, validateNewTicket, validateReply, categoryLabel } from './support'
import { parsePeriod, percent, periodRange } from './admin-stats'

describe('validateNewTicket', () => {
  it('chấp nhận phiếu hợp lệ và gọn lại khoảng trắng ở tiêu đề', () => {
    const r = validateNewTicket({ subject: '  Không   nhận được cọc ', category: 'payment', body: ' Em đã chuyển khoản ' })
    expect(r).toEqual({ ok: true, value: { subject: 'Không nhận được cọc', category: 'payment', body: 'Em đã chuyển khoản' } })
  })

  it('danh mục lạ rơi về "other"', () => {
    const r = validateNewTicket({ subject: 'Hỏi chút', category: 'hack', body: 'ok' })
    expect(r.ok && r.value.category).toBe('other')
  })

  it.each([
    [{ subject: 'ab', body: 'x' }, /ít nhất/],
    [{ subject: 'a'.repeat(121), body: 'x' }, /tối đa 120/],
    [{ subject: 'Tiêu đề', body: '   ' }, /mô tả/],
    [{ subject: 'Tiêu đề', body: 'x'.repeat(2001) }, /tối đa 2000/],
    [{ subject: 123 as unknown as string, body: 'x' }, /ít nhất/],
  ])('từ chối dữ liệu sai %#', (input, message) => {
    const r = validateNewTicket(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(message)
  })
})

describe('validateReply', () => {
  it('cắt khoảng trắng, từ chối rỗng và quá dài', () => {
    expect(validateReply('  chào  ')).toEqual({ ok: true, value: 'chào' })
    expect(validateReply('   ').ok).toBe(false)
    expect(validateReply('x'.repeat(2001)).ok).toBe(false)
    expect(validateReply(undefined).ok).toBe(false)
  })
})

describe('validateAnnouncement', () => {
  const base = { title: 'Bảo trì', body: 'Hệ thống bảo trì 2 giờ', kind: 'maintenance', audience: 'all', link: '' }

  it('hợp lệ, link trống thành null', () => {
    const r = validateAnnouncement(base)
    expect(r).toEqual({ ok: true, value: { ...base, link: null } })
  })

  it('cho phép đường dẫn nội bộ', () => {
    const r = validateAnnouncement({ ...base, link: '/clubs?sport=pickleball' })
    expect(r.ok && r.value.link).toBe('/clubs?sport=pickleball')
  })

  it.each(['https://evil.example/login', '//evil.example', 'javascript:alert(1)', '/a\\b', 'clubs'])(
    'chặn link ra ngoài hoặc sai dạng: %s',
    (link) => {
      expect(validateAnnouncement({ ...base, link }).ok).toBe(false)
    }
  )

  it('từ chối loại/đối tượng/độ dài sai', () => {
    expect(validateAnnouncement({ ...base, kind: 'spam' }).ok).toBe(false)
    expect(validateAnnouncement({ ...base, audience: 'everyone' }).ok).toBe(false)
    expect(validateAnnouncement({ ...base, title: 'ab' }).ok).toBe(false)
    expect(validateAnnouncement({ ...base, body: 'x'.repeat(1001) }).ok).toBe(false)
  })
})

describe('categoryLabel', () => {
  it('có nhãn tiếng Việt, mã lạ rơi về "Khác"', () => {
    expect(categoryLabel('payment')).toMatch(/Thanh toán/)
    expect(categoryLabel('???')).toBe('Khác')
  })
})

describe('periodRange / parsePeriod / percent', () => {
  it('khoảng 7 ngày theo giờ Việt Nam: từ 0h ngày đầu tới 0h ngày mai', () => {
    // 20/10/2026 10:00 VN
    const { from, to } = periodRange(7, new Date('2026-10-20T03:00:00Z'))
    expect(from.toISOString()).toBe('2026-10-13T17:00:00.000Z') // 14/10 00:00 VN
    expect(to.toISOString()).toBe('2026-10-20T17:00:00.000Z') // 21/10 00:00 VN
  })

  it('đúng ngày VN khi UTC còn là hôm trước', () => {
    // 23:30 UTC ngày 20/10 = 06:30 ngày 21/10 giờ VN
    const { to } = periodRange(1, new Date('2026-10-20T23:30:00Z'))
    expect(to.toISOString()).toBe('2026-10-21T17:00:00.000Z') // 22/10 00:00 VN
  })

  it('chỉ nhận 7, 30, 90 ngày', () => {
    expect(parsePeriod('7')).toBe(7)
    expect(parsePeriod('90')).toBe(90)
    expect(parsePeriod('15')).toBe(30)
    expect(parsePeriod(undefined)).toBe(30)
  })

  it('tỷ lệ phần trăm không chia cho 0', () => {
    expect(percent(1, 4)).toBe(25)
    expect(percent(5, 0)).toBe(0)
  })
})
