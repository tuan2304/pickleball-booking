import { describe, expect, it } from 'vitest'
import { clubDescription, clubJsonLd, serializeJsonLd, shareImage, truncateDescription } from './seo'

const club = {
  id: 'c1',
  name: 'Sân Thành Công',
  description: null,
  address: '12 Nguyễn Huệ',
  district: 'Quận 1',
  city: 'TP.HCM',
  latitude: 10.77,
  longitude: 106.7,
  open_time: '06:00:00',
  close_time: '22:30:00',
  images: ['https://cdn.example/a.jpg'],
}

describe('truncateDescription', () => {
  it('giữ nguyên chuỗi ngắn và gộp khoảng trắng', () => {
    expect(truncateDescription('  Sân   đẹp \n giá tốt ')).toBe('Sân đẹp giá tốt')
  })

  it('cắt ở ranh giới từ, không vượt độ dài và thêm …', () => {
    const out = truncateDescription('từ '.repeat(100), 50)
    expect(out.length).toBeLessThanOrEqual(50)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })
})

describe('clubDescription', () => {
  it('ưu tiên mô tả của chủ sân', () => {
    expect(clubDescription({ ...club, description: 'Mặt sân mới, có mái che' })).toBe('Mặt sân mới, có mái che')
  })

  it('chưa có mô tả thì tự dựng từ tên và địa chỉ', () => {
    const d = clubDescription(club)
    expect(d).toContain('Sân Thành Công')
    expect(d).toContain('12 Nguyễn Huệ, Quận 1, TP.HCM')
  })

  it('mô tả chỉ có khoảng trắng coi như chưa có', () => {
    expect(clubDescription({ ...club, description: '   ' })).toContain('Đặt sân tại')
  })
})

describe('shareImage', () => {
  it('chỉ nhận địa chỉ tuyệt đối http(s)', () => {
    expect(shareImage(['https://a/b.jpg'])).toBe('https://a/b.jpg')
    expect(shareImage(['/local.jpg'])).toBeUndefined()
    expect(shareImage(['javascript:alert(1)'])).toBeUndefined()
    expect(shareImage([])).toBeUndefined()
    expect(shareImage(null)).toBeUndefined()
  })
})

describe('clubJsonLd', () => {
  it('dựng đủ địa chỉ, toạ độ và giờ mở cửa', () => {
    const ld = clubJsonLd(club, 'https://x.vn/clubs/c1')
    expect(ld['@type']).toBe('SportsActivityLocation')
    expect(ld.url).toBe('https://x.vn/clubs/c1')
    expect(ld.address).toMatchObject({ streetAddress: '12 Nguyễn Huệ', addressLocality: 'Quận 1', addressCountry: 'VN' })
    expect(ld.geo).toMatchObject({ latitude: 10.77, longitude: 106.7 })
    expect(ld.openingHoursSpecification).toMatchObject({ opens: '06:00', closes: '22:30' })
    expect(ld).not.toHaveProperty('aggregateRating')
  })

  it('tính điểm trung bình, bỏ điểm không hợp lệ', () => {
    const ld = clubJsonLd(club, 'u', [5, 4, 4, 0, 9, Number.NaN])
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.3, reviewCount: 3 })
  })

  it('bỏ các trường thiếu dữ liệu thay vì để null', () => {
    const ld = clubJsonLd({ ...club, latitude: null, longitude: null, open_time: null, images: null, district: null, city: null }, 'u')
    expect(ld).not.toHaveProperty('geo')
    expect(ld).not.toHaveProperty('image')
    expect(ld).not.toHaveProperty('openingHoursSpecification')
    expect(ld.address).not.toHaveProperty('addressLocality')
  })
})

describe('serializeJsonLd', () => {
  it('không để nội dung người dùng đóng được thẻ script', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })
})
