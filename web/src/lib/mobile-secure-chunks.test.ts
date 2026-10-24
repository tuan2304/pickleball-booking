import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// File của app mobile nằm ngoài dự án web và dùng tsconfig riêng (extends expo/tsconfig.base), nên biên dịch tại chỗ
// bằng TypeScript rồi nạp, thay vì để Vite import trực tiếp.
interface KeyValueStore {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}
interface ChunksModule {
  safeKey(key: string): string
  splitChunks(value: string, size?: number): string[]
  createChunkedStore(backend: KeyValueStore, size?: number): KeyValueStore
}

function loadChunks(): ChunksModule {
  const source = readFileSync(join(process.cwd(), '..', 'mobile', 'src', 'lib', 'secure-chunks.ts'), 'utf-8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const mod = { exports: {} as ChunksModule }
  new Function('module', 'exports', outputText)(mod, mod.exports)
  return mod.exports
}

const { createChunkedStore, safeKey, splitChunks } = loadChunks()

/** Kho giả trong bộ nhớ, có thể giới hạn kích thước giá trị như SecureStore trên iOS. */
function memoryBackend(maxValue = 2048) {
  const data = new Map<string, string>()
  const backend: KeyValueStore = {
    async getItem(key) {
      return data.has(key) ? data.get(key)! : null
    },
    async setItem(key, value) {
      if (value.length > maxValue) throw new Error(`Giá trị ${key} vượt ${maxValue} byte`)
      if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error(`Khóa không hợp lệ: ${key}`)
      data.set(key, value)
    },
    async removeItem(key) {
      data.delete(key)
    },
  }
  return { backend, data }
}

const sessionJson = JSON.stringify({ access_token: 'a'.repeat(900), refresh_token: 'r'.repeat(40), user: { id: 'u', meta: 'x'.repeat(2500) } })

describe('safeKey', () => {
  it('chỉ giữ ký tự SecureStore cho phép', () => {
    expect(safeKey('sb-abc-auth-token')).toBe('sb-abc-auth-token')
    expect(safeKey('a b/c:d')).toBe('a_b_c_d')
  })
})

describe('splitChunks', () => {
  it('cắt đúng kích thước và ghép lại đúng nguyên văn', () => {
    const parts = splitChunks('x'.repeat(3200), 1500)
    expect(parts.map((p) => p.length)).toEqual([1500, 1500, 200])
    expect(parts.join('')).toBe('x'.repeat(3200))
  })
  it('chuỗi rỗng vẫn có một đoạn', () => {
    expect(splitChunks('')).toEqual([''])
  })
})

describe('createChunkedStore', () => {
  it('lưu và đọc lại phiên lớn hơn giới hạn 2048 byte của một giá trị', async () => {
    const { backend, data } = memoryBackend(2048)
    const store = createChunkedStore(backend)
    await store.setItem('sb-abc-auth-token', sessionJson)
    expect(sessionJson.length).toBeGreaterThan(2048)
    expect(await store.getItem('sb-abc-auth-token')).toBe(sessionJson)
    expect([...data.values()].every((v) => v.length <= 2048)).toBe(true)
  })

  it('chưa có gì thì trả null', async () => {
    const store = createChunkedStore(memoryBackend().backend)
    expect(await store.getItem('khong-co')).toBeNull()
  })

  it('ghi đè bằng giá trị ngắn hơn thì dọn các đoạn thừa', async () => {
    const { backend, data } = memoryBackend()
    const store = createChunkedStore(backend, 100)
    await store.setItem('k', 'x'.repeat(450)) // 5 đoạn
    await store.setItem('k', 'y'.repeat(120)) // 2 đoạn
    expect(await store.getItem('k')).toBe('y'.repeat(120))
    expect([...data.keys()].sort()).toEqual(['k.0', 'k.1', 'k.n'])
  })

  it('xóa sạch mọi đoạn', async () => {
    const { backend, data } = memoryBackend()
    const store = createChunkedStore(backend, 100)
    await store.setItem('k', 'x'.repeat(450))
    await store.removeItem('k')
    expect(data.size).toBe(0)
    expect(await store.getItem('k')).toBeNull()
  })

  it('một đoạn bị mất thì coi như chưa có phiên, không trả dữ liệu hỏng', async () => {
    const { backend, data } = memoryBackend()
    const store = createChunkedStore(backend, 100)
    await store.setItem('k', 'x'.repeat(450))
    data.delete('k.2')
    expect(await store.getItem('k')).toBeNull()
  })

  it('số đoạn bị sửa bậy thì không đọc', async () => {
    const { backend, data } = memoryBackend()
    const store = createChunkedStore(backend, 100)
    await store.setItem('k', 'x'.repeat(250))
    for (const bad of ['abc', '0', '-1', '9999', '1.5']) {
      data.set('k.n', bad)
      expect(await store.getItem('k'), bad).toBeNull()
    }
  })

  it('khóa có ký tự lạ vẫn lưu được nhờ safeKey', async () => {
    const { backend } = memoryBackend()
    const store = createChunkedStore(backend)
    await store.setItem('khóa lạ/1', 'giá trị')
    expect(await store.getItem('khóa lạ/1')).toBe('giá trị')
  })

  it('giá trị đúng bằng ranh giới đoạn', async () => {
    const { backend } = memoryBackend()
    const store = createChunkedStore(backend, 100)
    await store.setItem('k', 'z'.repeat(200))
    expect(await store.getItem('k')).toBe('z'.repeat(200))
  })
})
