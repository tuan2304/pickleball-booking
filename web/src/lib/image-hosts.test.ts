import { describe, expect, it } from 'vitest'
import { isOptimizableImage, supabaseHost } from './image-hosts'

const mine = 'abc.supabase.co'

describe('supabaseHost', () => {
  it('lấy hostname từ URL project', () => {
    expect(supabaseHost('https://abc.supabase.co')).toBe('abc.supabase.co')
    expect(supabaseHost('https://abc.supabase.co/rest/v1')).toBe('abc.supabase.co')
  })
  it('giá trị thiếu hoặc sai thì null', () => {
    expect(supabaseHost(undefined)).toBeNull()
    expect(supabaseHost('không phải url')).toBeNull()
  })
})

describe('isOptimizableImage', () => {
  it('cho Unsplash và đúng project Supabase của mình', () => {
    expect(isOptimizableImage('https://images.unsplash.com/photo-1', mine)).toBe(true)
    expect(isOptimizableImage('https://abc.supabase.co/storage/v1/object/public/club-images/a.jpg', mine)).toBe(true)
  })

  it('từ chối project Supabase khác, subdomain giả và http', () => {
    expect(isOptimizableImage('https://evil.supabase.co/x.png', mine)).toBe(false)
    expect(isOptimizableImage('https://abc.supabase.co.evil.com/x.png', mine)).toBe(false)
    expect(isOptimizableImage('http://images.unsplash.com/x.png', mine)).toBe(false)
  })

  it('chưa cấu hình Supabase thì chỉ còn Unsplash', () => {
    expect(isOptimizableImage('https://abc.supabase.co/x.png', null)).toBe(false)
    expect(isOptimizableImage('https://images.unsplash.com/x.png', null)).toBe(true)
  })

  it('chuỗi không phải URL', () => {
    expect(isOptimizableImage('/local.png', mine)).toBe(false)
  })
})
