import { describe, expect, it } from 'vitest'
import { resolveAppUrl } from './app-url'

describe('resolveAppUrl', () => {
  it('dùng NEXT_PUBLIC_APP_URL và bỏ dấu / cuối', () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'https://sportarena.vercel.app/' })).toBe('https://sportarena.vercel.app')
  })

  it('chỉ lấy địa chỉ đầu tiên khi bị dán thành danh sách (như file .env.local hiện tại)', () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000;http://localhost:3001' })).toBe('http://localhost:3000')
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'https://a.vn, https://b.vn' })).toBe('https://a.vn')
  })

  it('bỏ phần đường dẫn, chỉ giữ origin', () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'https://a.vn/some/path?x=1' })).toBe('https://a.vn')
  })

  it('rơi về domain production của Vercel khi chưa cấu hình', () => {
    expect(resolveAppUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'pickleball-booking.vercel.app' })).toBe(
      'https://pickleball-booking.vercel.app'
    )
  })

  it('bỏ qua giá trị rác và rơi về localhost', () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'khong-phai-url' })).toBe('http://localhost:3000')
    expect(resolveAppUrl({})).toBe('http://localhost:3000')
  })

  it('không nhận giao thức lạ như javascript:', () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'javascript:alert(1)' })).toBe('http://localhost:3000')
  })
})
