import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { createChunkedStore, type KeyValueStore } from './secure-chunks'

/**
 * Nơi lưu phiên đăng nhập Supabase trong Keychain (iOS) / Keystore (Android) thay vì AsyncStorage không mã hóa.
 *
 * SecureStore không ổn định với giá trị lớn (một số bản iOS từ chối trên khoảng 2048 byte) mà phiên Supabase
 * (access token + refresh token + thông tin người dùng) thường vượt mức đó, nên giá trị được cắt thành các đoạn
 * nhỏ: <key>.0, <key>.1, ... và <key>.n ghi số đoạn.
 *
 * Người dùng đã đăng nhập bằng bản cũ có phiên trong AsyncStorage: đọc ra, chuyển sang kho an toàn rồi xóa bản cũ,
 * nên cập nhật app không làm ai bị đăng xuất.
 */
const secureBackend: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}

const secure = createChunkedStore(secureBackend)

/** Kho dùng cho Supabase Auth: ưu tiên kho an toàn, tự chuyển phiên cũ từ AsyncStorage sang. */
export const sessionStorage: KeyValueStore = {
  async getItem(key) {
    const current = await secure.getItem(key)
    if (current !== null) return current

    const legacy = await AsyncStorage.getItem(key)
    if (legacy !== null) {
      try {
        await secure.setItem(key, legacy)
        await AsyncStorage.removeItem(key)
      } catch {
        // Không chuyển được thì vẫn dùng bản cũ lần này, lần sau thử lại
      }
    }
    return legacy
  },
  async setItem(key, value) {
    await secure.setItem(key, value)
    await AsyncStorage.removeItem(key)
  },
  async removeItem(key) {
    await secure.removeItem(key)
    await AsyncStorage.removeItem(key)
  },
}
