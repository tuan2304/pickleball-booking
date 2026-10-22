import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Mã hóa đối xứng AES-256-GCM cho các khóa bí mật của chủ sân (PayOS API key, checksum key) trước khi lưu DB.
 * Khóa mã hóa nằm ở biến môi trường PAYMENT_SETTINGS_ENCRYPTION_KEY (32 byte, mã hóa base64), KHÔNG nằm trong DB,
 * nên lộ DB riêng lẻ không làm lộ khóa của chủ sân.
 *
 * Tạo khóa:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Định dạng lưu: v1.<iv>.<tag>.<ciphertext>  (mỗi phần base64url)
 */

const VERSION = 'v1'

export class EncryptionConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EncryptionConfigError'
  }
}

function loadKey(raw: string | undefined): Buffer {
  if (!raw) {
    throw new EncryptionConfigError('Chưa cấu hình PAYMENT_SETTINGS_ENCRYPTION_KEY trên máy chủ')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new EncryptionConfigError('PAYMENT_SETTINGS_ENCRYPTION_KEY phải là 32 byte mã hóa base64')
  }
  return key
}

export function encryptSecret(plain: string, rawKey: string | undefined = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY): string {
  const key = loadKey(rawKey)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join('.')
}

export function decryptSecret(token: string, rawKey: string | undefined = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY): string {
  const key = loadKey(rawKey)
  const [version, iv, tag, data] = token.split('.')
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error('Dữ liệu mã hóa không đúng định dạng')
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}
