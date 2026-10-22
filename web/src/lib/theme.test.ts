import { describe, expect, it, vi } from 'vitest'
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '@/lib/theme'

/** Chạy script khởi tạo với môi trường trình duyệt giả và trả về trạng thái <html> sau khi chạy. */
function runInit(stored: string | null, systemDark: boolean, storageThrows = false) {
  const classes = new Set<string>()
  const root = {
    classList: {
      toggle: (name: string, on: boolean) => {
        if (on) classes.add(name)
        else classes.delete(name)
      },
    },
    style: { colorScheme: '' },
  }
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => {
      if (storageThrows) throw new Error('blocked')
      return key === THEME_STORAGE_KEY ? stored : null
    },
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: systemDark }) })
  vi.stubGlobal('document', { documentElement: root })
  new Function(THEME_INIT_SCRIPT)()
  return { dark: classes.has('dark'), colorScheme: root.style.colorScheme }
}

describe('THEME_INIT_SCRIPT', () => {
  it('theo hệ thống khi chưa tự chọn', () => {
    expect(runInit(null, true)).toEqual({ dark: true, colorScheme: 'dark' })
    expect(runInit(null, false)).toEqual({ dark: false, colorScheme: 'light' })
  })

  it('lựa chọn của người dùng thắng cài đặt hệ thống', () => {
    expect(runInit('light', true)).toEqual({ dark: false, colorScheme: 'light' })
    expect(runInit('dark', false)).toEqual({ dark: true, colorScheme: 'dark' })
  })

  it('giá trị lạ được coi như chưa chọn', () => {
    expect(runInit('purple', true).dark).toBe(true)
  })

  it('không làm hỏng trang khi localStorage bị chặn', () => {
    expect(() => runInit(null, true, true)).not.toThrow()
  })
})
