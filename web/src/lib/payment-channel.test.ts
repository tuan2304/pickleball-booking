import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeClient, createFakeDb, type FakeDb } from '@/test/fake-supabase'
import { encryptSecret } from './crypto'
import { canAcceptBookings, credentialsForStoredChannel, resolveClubChannel } from './payment-channel'

const ENV_KEYS = ['PAYMENT_SETTINGS_ENCRYPTION_KEY', 'PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'] as const
const saved: Record<string, string | undefined> = {}
let db: FakeDb

const admin = () => createFakeClient(db) as unknown as Parameters<typeof resolveClubChannel>[0]

function settings(verified: boolean) {
  return {
    club_id: 'club-1',
    payos_client_id: 'club-client',
    payos_api_key_enc: encryptSecret('club-api', process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY),
    payos_checksum_key_enc: encryptSecret('club-checksum', process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY),
    verified_at: verified ? '2026-10-22T00:00:00Z' : null,
  }
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k]
  process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  delete process.env.PAYOS_CLIENT_ID
  delete process.env.PAYOS_API_KEY
  delete process.env.PAYOS_CHECKSUM_KEY
  db = createFakeDb({ club_payment_settings: [] })
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.restoreAllMocks()
})

function setPlatformKeys() {
  process.env.PAYOS_CLIENT_ID = 'plat-client'
  process.env.PAYOS_API_KEY = 'plat-api'
  process.env.PAYOS_CHECKSUM_KEY = 'plat-checksum'
}

describe('resolveClubChannel', () => {
  it('cụm sân đã kết nối PayOS riêng: dùng khóa của cụm sân (giải mã đúng)', async () => {
    db.tables.club_payment_settings.push(settings(true))
    setPlatformKeys()

    const ch = await resolveClubChannel(admin(), 'club-1')

    expect(ch).toEqual({
      kind: 'club',
      clubId: 'club-1',
      creds: { clientId: 'club-client', apiKey: 'club-api', checksumKey: 'club-checksum' },
    })
  })

  it('đã nhập khóa nhưng chưa xác thực được: không dùng khóa đó và không rơi về kênh nền tảng', async () => {
    db.tables.club_payment_settings.push(settings(false))
    setPlatformKeys()

    expect(await resolveClubChannel(admin(), 'club-1')).toBeNull()
  })

  it('chưa kết nối PayOS riêng: không nhận đặt sân, tiền của khách không vào kênh nền tảng', async () => {
    setPlatformKeys()
    expect(await resolveClubChannel(admin(), 'club-1')).toBeNull()
  })

  it('không có khóa nào (môi trường dev): giả lập', async () => {
    expect(await resolveClubChannel(admin(), 'club-1')).toEqual({ kind: 'simulation' })
  })
})

describe('credentialsForStoredChannel', () => {
  it('kênh club → khóa của cụm sân', async () => {
    db.tables.club_payment_settings.push(settings(true))
    expect(await credentialsForStoredChannel(admin(), 'club', 'club-1')).toMatchObject({ clientId: 'club-client' })
  })

  it('kênh platform hoặc đơn cũ chưa ghi kênh → khóa nền tảng', async () => {
    setPlatformKeys()
    expect(await credentialsForStoredChannel(admin(), 'platform', undefined)).toMatchObject({ clientId: 'plat-client' })
    expect(await credentialsForStoredChannel(admin(), undefined, undefined)).toMatchObject({ clientId: 'plat-client' })
  })

  it('đơn giả lập hoặc cụm sân đã xóa khóa → không có khóa (webhook sẽ bị từ chối)', async () => {
    expect(await credentialsForStoredChannel(admin(), 'simulation', undefined)).toBeNull()
    expect(await credentialsForStoredChannel(admin(), 'club', 'club-1')).toBeNull()
  })
})

describe('canAcceptBookings', () => {
  it('chỉ nhận đặt khi cụm sân tự kết nối PayOS (khóa nền tảng không làm cụm sân nhận đặt được)', () => {
    expect(canAcceptBookings(true)).toBe(true)
    setPlatformKeys()
    expect(canAcceptBookings(false)).toBe(false)
  })

  it('môi trường dev chưa có khóa nào: cho đặt thử bằng giả lập', () => {
    expect(canAcceptBookings(false)).toBe(true)
  })
})
