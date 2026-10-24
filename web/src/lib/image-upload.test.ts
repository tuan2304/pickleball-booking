import { describe, expect, it } from 'vitest'
import {
  imageExtension,
  imagePath,
  isOwnImageUrl,
  MAX_CLUB_IMAGES,
  MAX_CLUB_IMAGE_BYTES,
  ownImagePath,
  publicImageUrl,
  validateClubImages,
  validateImageFile,
} from './image-upload'

const SB = 'https://abc.supabase.co'
const CLUB = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const FILE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const url = (folder: string, file = `${FILE}.jpg`, bucket = 'club-images') => `${SB}/storage/v1/object/public/${bucket}/${folder}/${file}`

describe('validateImageFile', () => {
  it('nhận JPG, PNG, WebP trong giới hạn', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateImageFile({ type, size: 1000 }, MAX_CLUB_IMAGE_BYTES)).toBeNull()
    }
  })

  it('từ chối SVG, GIF, PDF, loại lạ', () => {
    for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', 'text/html', '']) {
      expect(validateImageFile({ type, size: 1000 }, MAX_CLUB_IMAGE_BYTES), type).toMatch(/JPG, PNG hoặc WebP/)
    }
  })

  it('từ chối file rỗng và file quá lớn', () => {
    expect(validateImageFile({ type: 'image/png', size: 0 }, 100)).toMatch(/trống/)
    expect(validateImageFile({ type: 'image/png', size: MAX_CLUB_IMAGE_BYTES + 1 }, MAX_CLUB_IMAGE_BYTES)).toMatch(/tối đa 5 MB/)
    expect(validateImageFile({ type: 'image/png', size: MAX_CLUB_IMAGE_BYTES }, MAX_CLUB_IMAGE_BYTES)).toBeNull()
  })
})

describe('imagePath / imageExtension', () => {
  it('đuôi file lấy từ loại ảnh, không từ tên file', () => {
    expect(imageExtension('image/jpeg')).toBe('jpg')
    expect(imageExtension('image/png')).toBe('png')
    expect(imageExtension('image/webp')).toBe('webp')
    expect(imageExtension('image/svg+xml')).toBeNull()
    expect(imagePath(CLUB, FILE, 'image/webp')).toBe(`${CLUB}/${FILE}.webp`)
    expect(imagePath(CLUB, FILE, 'text/html')).toBeNull()
  })
})

describe('ownImagePath / isOwnImageUrl', () => {
  it('nhận URL trong đúng thư mục của chủ thể', () => {
    expect(ownImagePath('club-images', CLUB, url(CLUB), SB)).toBe(`${CLUB}/${FILE}.jpg`)
    expect(isOwnImageUrl('avatars', CLUB, url(CLUB, `${FILE}.png`, 'avatars'), SB)).toBe(true)
  })

  it('round-trip với publicImageUrl', () => {
    const path = imagePath(CLUB, FILE, 'image/png')!
    expect(isOwnImageUrl('club-images', CLUB, publicImageUrl('club-images', path, `${SB}/`), SB)).toBe(true)
  })

  it('từ chối thư mục của người khác, sai bucket, sai project', () => {
    expect(isOwnImageUrl('club-images', CLUB, url(OTHER), SB)).toBe(false)
    expect(isOwnImageUrl('club-images', CLUB, url(CLUB, `${FILE}.jpg`, 'avatars'), SB)).toBe(false)
    expect(isOwnImageUrl('club-images', CLUB, url(CLUB).replace('abc.', 'evil.'), SB)).toBe(false)
  })

  it('từ chối đường dẫn lắt léo: .., lồng thư mục, tên file lạ, đuôi svg, query', () => {
    const base = `${SB}/storage/v1/object/public/club-images/${CLUB}`
    for (const bad of [
      `${base}/../${OTHER}/${FILE}.jpg`,
      `${base}/sub/${FILE}.jpg`,
      `${base}/${FILE}.svg`,
      `${base}/evil.jpg`,
      `${base}/${FILE}.jpg?x=1`,
      `${base}/${FILE}.jpg#a`,
      `${base}/`,
      `${base}`,
      `http://abc.supabase.co/storage/v1/object/public/club-images/${CLUB}/${FILE}.jpg`,
      'https://images.unsplash.com/photo-1',
      'javascript:alert(1)',
    ]) {
      expect(isOwnImageUrl('club-images', CLUB, bad, SB), bad).toBe(false)
    }
  })
})

describe('validateClubImages', () => {
  const good = url(CLUB)
  const legacy = 'https://images.unsplash.com/photo-1574629810360'

  it('nhận ảnh trong kho của cụm sân và giữ ảnh cũ đã có', () => {
    const r = validateClubImages(CLUB, [good, legacy], [legacy], SB)
    expect(r).toEqual({ ok: true, images: [good, legacy] })
  })

  it('loại trùng lặp', () => {
    expect(validateClubImages(CLUB, [good, good], [], SB)).toEqual({ ok: true, images: [good] })
  })

  it('từ chối ảnh ngoài kho mà chưa có trong danh sách cũ', () => {
    expect(validateClubImages(CLUB, [legacy], [], SB).ok).toBe(false)
    expect(validateClubImages(CLUB, [url(OTHER)], [], SB).ok).toBe(false)
  })

  it('từ chối quá số lượng và dữ liệu không phải mảng chuỗi', () => {
    const many = Array.from({ length: MAX_CLUB_IMAGES + 1 }, (_, i) => url(CLUB, `aaaaaaaa-aaaa-aaaa-aaaa-${String(i).padStart(12, '0')}.jpg`))
    expect(validateClubImages(CLUB, many, [], SB).ok).toBe(false)
    expect(validateClubImages(CLUB, 'x', [], SB).ok).toBe(false)
    expect(validateClubImages(CLUB, [1, 2], [], SB).ok).toBe(false)
    expect(validateClubImages(CLUB, null, [], SB).ok).toBe(false)
  })

  it('cho phép xóa hết ảnh', () => {
    expect(validateClubImages(CLUB, [], [good], SB)).toEqual({ ok: true, images: [] })
  })
})
