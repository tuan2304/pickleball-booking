import { describe, expect, it } from 'vitest'
import { clubsHref, pageItems, pageRange, parsePage, sanitizeSearch, totalPages } from './club-search'

describe('parsePage', () => {
  it('nhận số nguyên dương', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('7')).toBe(7)
  })

  it('giá trị lạ rơi về trang 1', () => {
    for (const bad of [undefined, '', '0', '-3', '2.5', 'abc', 'NaN', '99999999']) {
      expect(parsePage(bad)).toBe(1)
    }
  })
})

describe('sanitizeSearch', () => {
  it('giữ nguyên tiếng Việt có dấu', () => {
    expect(sanitizeSearch('Quận Gò Vấp')).toBe('Quận Gò Vấp')
  })

  it('bỏ ký tự làm hỏng bộ lọc PostgREST và ilike', () => {
    expect(sanitizeSearch('a,name.eq.x)')).toBe('a name.eq.x')
    expect(sanitizeSearch('100%_sân*')).toBe('100 sân')
    expect(sanitizeSearch(`"; drop table clubs; --`)).toBe('; drop table clubs; --')
  })

  it('gộp khoảng trắng, cắt độ dài và chịu được giá trị rỗng', () => {
    expect(sanitizeSearch('  a    b  ')).toBe('a b')
    expect(sanitizeSearch('x'.repeat(200))).toHaveLength(80)
    expect(sanitizeSearch(undefined)).toBe('')
  })
})

describe('totalPages và pageRange', () => {
  it('luôn có ít nhất 1 trang', () => {
    expect(totalPages(0)).toBe(1)
    expect(totalPages(12)).toBe(1)
    expect(totalPages(13)).toBe(2)
    expect(totalPages(60)).toBe(5)
  })

  it('khoảng dòng của từng trang liền nhau, không chồng lấn', () => {
    expect(pageRange(1)).toEqual([0, 11])
    expect(pageRange(2)).toEqual([12, 23])
    expect(pageRange(3, 5)).toEqual([10, 14])
  })
})

describe('clubsHref', () => {
  it('không có bộ lọc thì là /clubs', () => {
    expect(clubsHref({})).toBe('/clubs')
    expect(clubsHref({ sport: 'all', district: 'Tất cả khu vực', page: 1 })).toBe('/clubs')
  })

  it('giữ bộ lọc, bỏ page=1 và mã hóa tiếng Việt', () => {
    expect(clubsHref({ sport: 'pickleball', district: 'Gò Vấp', page: 1 })).toBe('/clubs?sport=pickleball&district=G%C3%B2+V%E1%BA%A5p')
    expect(clubsHref({ q: 'sân a', page: 3 })).toBe('/clubs?q=s%C3%A2n+a&page=3')
  })
})

describe('pageItems', () => {
  it('ít trang thì hiện hết', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('nhiều trang thì rút gọn bằng dấu …', () => {
    expect(pageItems(1, 20)).toEqual([1, 2, '…', 20])
    expect(pageItems(6, 20)).toEqual([1, '…', 5, 6, 7, '…', 20])
    expect(pageItems(20, 20)).toEqual([1, '…', 19, 20])
  })

  it('khoảng trống đúng một trang thì hiện số thay vì dấu …', () => {
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, '…', 20])
  })
})
