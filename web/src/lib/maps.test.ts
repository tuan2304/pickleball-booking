import { describe, expect, it, vi } from 'vitest'
import {
  buildDirectionsUrl,
  buildEmbedUrl,
  buildViewUrl,
  fullAddress,
  hasCoordinates,
  isAllowedMapsHost,
  isShortMapsLink,
  isValidLatLng,
  parseCoordinates,
} from './maps'
import { resolveCoordinates } from './maps-resolve'

describe('isValidLatLng', () => {
  it('chấp nhận toạ độ hợp lệ, từ chối ngoài phạm vi, NaN và (0,0)', () => {
    expect(isValidLatLng(10.7769, 106.7009)).toBe(true)
    expect(isValidLatLng(91, 10)).toBe(false)
    expect(isValidLatLng(10, 181)).toBe(false)
    expect(isValidLatLng(NaN, 10)).toBe(false)
    expect(isValidLatLng(0, 0)).toBe(false)
  })
})

describe('parseCoordinates', () => {
  it('cặp toạ độ thuần với nhiều cách viết', () => {
    const want = { lat: 10.7769, lng: 106.7009 }
    expect(parseCoordinates('10.7769, 106.7009')).toEqual(want)
    expect(parseCoordinates('10.7769,106.7009')).toEqual(want)
    expect(parseCoordinates('  10.7769 ; 106.7009 ')).toEqual(want)
    expect(parseCoordinates('(10.7769, 106.7009)')).toEqual(want)
    expect(parseCoordinates('10.7769° 106.7009°')).toEqual(want)
  })

  it('toạ độ âm', () => {
    expect(parseCoordinates('-33.8688, 151.2093')).toEqual({ lat: -33.8688, lng: 151.2093 })
  })

  it('link Google Maps dạng /@lat,lng,zoom', () => {
    const url = 'https://www.google.com/maps/place/Sân+Pickleball/@10.8031,106.7358,17z/data=!4m6'
    expect(parseCoordinates(url)).toEqual({ lat: 10.8031, lng: 106.7358 })
  })

  it('ưu tiên !3d!4d (vị trí địa điểm) hơn @ (tâm khung nhìn)', () => {
    const url = 'https://www.google.com/maps/place/X/@10.0,106.0,15z/data=!3m1!4b1!4m6!3d10.8031!4d106.7358'
    expect(parseCoordinates(url)).toEqual({ lat: 10.8031, lng: 106.7358 })
  })

  it('link dạng ?q= và destination=', () => {
    expect(parseCoordinates('https://maps.google.com/?q=10.8031,106.7358')).toEqual({ lat: 10.8031, lng: 106.7358 })
    expect(parseCoordinates('https://www.google.com/maps/dir/?api=1&destination=10.8031%2C106.7358')).toEqual({
      lat: 10.8031,
      lng: 106.7358,
    })
  })

  it('không đọc được thì trả null', () => {
    expect(parseCoordinates('')).toBeNull()
    expect(parseCoordinates('123 Nguyễn Huệ, Quận 1')).toBeNull()
    expect(parseCoordinates('https://www.google.com/maps/place/abc')).toBeNull()
    expect(parseCoordinates('999, 999')).toBeNull()
  })
})

describe('link rút gọn và host được phép', () => {
  it('nhận diện link rút gọn của Google Maps', () => {
    expect(isShortMapsLink('https://maps.app.goo.gl/AbC123')).toBe(true)
    expect(isShortMapsLink('http://maps.app.goo.gl/AbC123')).toBe(false)
    expect(isShortMapsLink('https://evil.com/maps.app.goo.gl')).toBe(false)
  })

  it('chỉ cho phép host của Google, chặn địa chỉ nội bộ', () => {
    expect(isAllowedMapsHost('https://www.google.com/maps/place/x')).toBe(true)
    expect(isAllowedMapsHost('http://www.google.com/maps')).toBe(false)
    expect(isAllowedMapsHost('https://169.254.169.254/latest/meta-data')).toBe(false)
    expect(isAllowedMapsHost('https://localhost:3000')).toBe(false)
    expect(isAllowedMapsHost('https://google.com.evil.example/')).toBe(false)
  })
})

describe('resolveCoordinates', () => {
  const redirect = (location: string) => ({ status: 302, headers: { get: (n: string) => (n.toLowerCase() === 'location' ? location : null) } })

  it('toạ độ trực tiếp không cần gọi mạng', async () => {
    const fetchFn = vi.fn()
    expect(await resolveCoordinates('10.7769, 106.7009', fetchFn)).toEqual({ lat: 10.7769, lng: 106.7009 })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('mở rộng link rút gọn và đọc toạ độ từ địa chỉ chuyển hướng', async () => {
    const fetchFn = vi.fn().mockResolvedValue(redirect('https://www.google.com/maps/place/X/@10.8031,106.7358,17z'))
    expect(await resolveCoordinates('https://maps.app.goo.gl/AbC', fetchFn)).toEqual({ lat: 10.8031, lng: 106.7358 })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('đi theo nhiều bước chuyển hướng trong phạm vi Google', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(redirect('https://goo.gl/maps/step2'))
      .mockResolvedValueOnce(redirect('https://www.google.com/maps/place/X/@10.8031,106.7358,17z'))
    expect(await resolveCoordinates('https://maps.app.goo.gl/AbC', fetchFn)).toEqual({ lat: 10.8031, lng: 106.7358 })
  })

  it('DỪNG khi bị chuyển hướng ra ngoài Google (không gọi tới host lạ)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(redirect('https://169.254.169.254/latest/meta-data'))
    expect(await resolveCoordinates('https://maps.app.goo.gl/AbC', fetchFn)).toBeNull()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('không lặp vô hạn khi chuyển hướng vòng', async () => {
    const fetchFn = vi.fn().mockResolvedValue(redirect('https://goo.gl/maps/loop'))
    expect(await resolveCoordinates('https://maps.app.goo.gl/AbC', fetchFn)).toBeNull()
    expect(fetchFn.mock.calls.length).toBeLessThanOrEqual(5)
  })

  it('link thường không phải link Google Maps rút gọn thì không gọi mạng', async () => {
    const fetchFn = vi.fn()
    expect(await resolveCoordinates('https://example.com/abc', fetchFn)).toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('xây URL', () => {
  const pinned = { lat: 10.8031, lng: 106.7358, name: 'CLB A', address: '1 Đường B' }
  const unpinned = { name: 'CLB A', address: '1 Đường B, Quận 2' }

  it('có toạ độ thì dùng toạ độ', () => {
    expect(buildDirectionsUrl(pinned)).toBe('https://www.google.com/maps/dir/?api=1&destination=10.8031%2C106.7358')
    expect(buildViewUrl(pinned)).toBe('https://www.google.com/maps/search/?api=1&query=10.8031%2C106.7358')
  })

  it('chưa ghim vị trí thì dùng tên + địa chỉ', () => {
    expect(buildDirectionsUrl(unpinned)).toContain('destination=CLB%20A%2C%201%20%C4%90%C6%B0%E1%BB%9Dng%20B')
  })

  it('không có gì để tìm thì trả null', () => {
    expect(buildDirectionsUrl({})).toBeNull()
    expect(buildEmbedUrl({})).toBeNull()
  })

  it('bản đồ nhúng: có khóa thì dùng Embed API, không có thì dạng không cần khóa', () => {
    expect(buildEmbedUrl(pinned, 'KEY123')).toBe(
      'https://www.google.com/maps/embed/v1/place?key=KEY123&q=10.8031%2C106.7358&zoom=17'
    )
    expect(buildEmbedUrl(pinned)).toBe('https://www.google.com/maps?q=10.8031%2C106.7358&z=17&output=embed')
  })

  it('hasCoordinates từ chối toạ độ không hợp lệ', () => {
    expect(hasCoordinates(pinned)).toBe(true)
    expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(false)
    expect(hasCoordinates({ lat: null, lng: null })).toBe(false)
  })

  it('fullAddress bỏ phần trống', () => {
    expect(fullAddress({ address: '1 Đường B', ward: null, district: 'Quận 2', city: ' TP.HCM ' })).toBe('1 Đường B, Quận 2, TP.HCM')
  })
})
