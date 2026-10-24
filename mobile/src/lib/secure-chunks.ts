/**
 * Chia nhỏ giá trị để lưu trong kho khóa-giá trị có giới hạn kích thước (SecureStore). Phần thuần túy, không đụng
 * module native nên kiểm thử được ngoài thiết bị (xem web/src/lib/mobile-secure-chunks.test.ts).
 */
export const CHUNK_SIZE = 1500

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/** Tên khóa của SecureStore chỉ gồm chữ, số, '.', '-', '_'; ký tự khác được thay bằng '_'. */
export function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_')
}

export function splitChunks(value: string, size = CHUNK_SIZE): string[] {
  if (value.length === 0) return ['']
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size))
  return chunks
}

/** Bộ lưu theo đoạn dựng trên một kho khóa-giá trị bất kỳ (SecureStore thật, hoặc kho giả khi kiểm thử). */
export function createChunkedStore(backend: KeyValueStore, size = CHUNK_SIZE): KeyValueStore {
  const countKey = (key: string) => `${safeKey(key)}.n`
  const partKey = (key: string, i: number) => `${safeKey(key)}.${i}`

  async function remove(key: string) {
    const raw = await backend.getItem(countKey(key))
    const count = raw === null ? 0 : Number(raw)
    if (Number.isInteger(count) && count > 0) {
      for (let i = 0; i < count; i++) await backend.removeItem(partKey(key, i))
    }
    await backend.removeItem(countKey(key))
  }

  return {
    async getItem(key) {
      const raw = await backend.getItem(countKey(key))
      if (raw === null) return null
      const count = Number(raw)
      if (!Number.isInteger(count) || count < 1 || count > 64) return null

      let value = ''
      for (let i = 0; i < count; i++) {
        const part = await backend.getItem(partKey(key, i))
        if (part === null) return null // đoạn bị mất: coi như chưa có phiên, bắt đăng nhập lại thay vì dùng dữ liệu hỏng
        value += part
      }
      return value
    },

    async setItem(key, value) {
      const parts = splitChunks(value, size)
      // Ghi đoạn trước, ghi số đoạn sau cùng: đang ghi dở mà app bị tắt thì vẫn đọc được bản cũ hoặc không có gì
      for (let i = 0; i < parts.length; i++) await backend.setItem(partKey(key, i), parts[i])
      const previous = await backend.getItem(countKey(key))
      await backend.setItem(countKey(key), String(parts.length))
      const oldCount = previous === null ? 0 : Number(previous)
      for (let i = parts.length; i < oldCount; i++) await backend.removeItem(partKey(key, i))
    },

    removeItem: remove,
  }
}
