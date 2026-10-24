/**
 * Tìm kiếm và phân trang danh sách cụm sân (/clubs). Lọc và cắt trang làm ở database,
 * nên trang vẫn nhanh khi số cụm sân lớn; các hàm ở đây là phần thuần túy, có test.
 */
export const CLUBS_PER_PAGE = 12
export const ALL_SPORTS = 'all'
export const ALL_DISTRICTS = 'Tất cả khu vực'

export interface ClubListParams {
  q?: string
  district?: string
  sport?: string
  page?: number
}

/** Số trang hợp lệ từ query string; giá trị lạ (chữ, số âm, số thập phân) rơi về trang 1. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1
}

/**
 * Bỏ các ký tự có nghĩa đặc biệt trong bộ lọc PostgREST (dấu phẩy, ngoặc) và trong ilike (% _ *),
 * để từ khóa của người dùng không phá câu lọc hay biến thành ký tự đại diện.
 */
export function sanitizeSearch(raw: string | undefined): string {
  return (raw ?? '').replace(/[,()%*_\\"'`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function totalPages(totalItems: number, perPage = CLUBS_PER_PAGE): number {
  return Math.max(1, Math.ceil(totalItems / perPage))
}

/** Khoảng dòng (đầu và cuối, tính từ 0, gồm cả hai đầu) của một trang, dùng cho .range() */
export function pageRange(page: number, perPage = CLUBS_PER_PAGE): [number, number] {
  return [(page - 1) * perPage, page * perPage - 1]
}

/** Đường dẫn tới một trang danh sách; bỏ các tham số mang giá trị mặc định cho URL ngắn và ổn định. */
export function clubsHref({ q, district, sport, page }: ClubListParams): string {
  const params = new URLSearchParams()
  if (sport && sport !== ALL_SPORTS) params.set('sport', sport)
  if (district && district !== ALL_DISTRICTS && district !== 'all') params.set('district', district)
  if (q) params.set('q', q)
  if (page && page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/clubs?${qs}` : '/clubs'
}

/**
 * Các mục hiển thị ở thanh phân trang: luôn có trang đầu, trang cuối và các trang kề trang hiện tại;
 * khoảng trống dài được thay bằng dấu "…". Ví dụ trang 6/20 → 1 … 5 6 7 … 20
 */
export function pageItems(current: number, total: number): Array<number | '…'> {
  const wanted = new Set<number>([1, total, current - 1, current, current + 1])
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const items: Array<number | '…'> = []
  pages.forEach((p, i) => {
    const prev = pages[i - 1]
    if (prev !== undefined) {
      if (p - prev === 2) items.push(prev + 1)
      else if (p - prev > 2) items.push('…')
    }
    items.push(p)
  })
  return items
}
