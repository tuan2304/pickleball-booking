/** Chế độ giao diện: theo hệ thống cho tới khi người dùng tự chọn sáng/tối. */
export const THEME_STORAGE_KEY = 'sa-theme'

export type ThemeChoice = 'light' | 'dark'

/**
 * Chạy trong <head> trước khi trang được vẽ để không bị nháy sáng rồi mới chuyển tối.
 * Phải tự đứng được (không import), vì được nhúng thẳng vào HTML dưới dạng chuỗi.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(_){}})()`

/** Áp dụng giao diện lên <html> và (nếu có) nhớ lựa chọn. localStorage có thể bị chặn nên bọc try/catch. */
export function applyTheme(theme: ThemeChoice, persist = true): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  if (!persist) return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Chế độ riêng tư / chặn lưu trữ: vẫn đổi được trong phiên hiện tại
  }
}

export function readStoredTheme(): ThemeChoice | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}
