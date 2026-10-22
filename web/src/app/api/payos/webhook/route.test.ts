import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeClient, createFakeDb, type FakeDb } from '@/test/fake-supabase'

let db: FakeDb
const verifyPaymentWebhook = vi.fn()
const settlePayment = vi.fn()
const settleSubscription = vi.fn()
const credentialsForStoredChannel = vi.fn()
const getPlatformCredentials = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createFakeClient(db) }))
vi.mock('@/lib/payos', () => ({
  verifyPaymentWebhook: (...a: unknown[]) => verifyPaymentWebhook(...a),
  getPlatformCredentials: () => getPlatformCredentials(),
}))
vi.mock('@/lib/payment-channel', () => ({
  credentialsForStoredChannel: (...a: unknown[]) => credentialsForStoredChannel(...a),
}))
vi.mock('@/lib/payments', () => ({ settlePayment: (a: unknown) => settlePayment(a) }))
vi.mock('@/lib/subscriptions', () => ({ settleSubscription: (a: unknown) => settleSubscription(a) }))

import { POST } from './route'

const CLUB_CREDS = { clientId: 'club-id', apiKey: 'club-key', checksumKey: 'club-checksum' }
const PLATFORM_CREDS = { clientId: 'plat-id', apiKey: 'plat-key', checksumKey: 'plat-checksum' }

const post = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/payos/webhook', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  )

/** Payload giống PayOS gửi: data.orderCode chưa được tin cho tới khi chữ ký hợp lệ */
const payload = (orderCode: number) => ({ code: '00', success: true, data: { orderCode, amount: 30000 }, signature: 'sig' })

beforeEach(() => {
  db = createFakeDb({
    payments: [
      { id: 'pay-club', order_code: 111, metadata: { channel: 'club', club_id: 'club-1' } },
      { id: 'pay-platform', order_code: 222, metadata: { channel: 'platform', club_id: 'club-2' } },
    ],
    subscription_payments: [{ id: 'sub-1', order_code: 333 }],
  })
  verifyPaymentWebhook.mockReset()
  settlePayment.mockReset()
  settleSubscription.mockReset()
  credentialsForStoredChannel.mockReset()
  getPlatformCredentials.mockReset()
  getPlatformCredentials.mockReturnValue(PLATFORM_CREDS)
  credentialsForStoredChannel.mockImplementation(async (_a, channel) => (channel === 'club' ? CLUB_CREDS : PLATFORM_CREDS))
  verifyPaymentWebhook.mockImplementation(async (body: { data: { orderCode: number } }) => ({
    orderCode: body.data.orderCode,
    amount: 30000,
    reference: 'TF99',
    success: true,
  }))
  settlePayment.mockResolvedValue({ ok: true })
  settleSubscription.mockResolvedValue({ ok: true })
})

describe('POST /api/payos/webhook', () => {
  it('body không phải JSON → 400', async () => {
    expect((await post('không phải json {{{')).status).toBe(400)
  })

  it('JSON hợp lệ nhưng không có orderCode → 200 bỏ qua (không làm hỏng việc đăng ký webhook), không đụng dữ liệu', async () => {
    for (const body of [{ data: {} }, { data: { orderCode: -5 } }, {}, null]) {
      expect((await post(body)).status).toBe(200)
    }
    expect(verifyPaymentWebhook).not.toHaveBeenCalled()
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('đơn không tồn tại (payload thử khi đăng ký URL) → 200 và không động vào dữ liệu', async () => {
    const res = await post(payload(123))
    expect(res.status).toBe(200)
    expect(verifyPaymentWebhook).not.toHaveBeenCalled()
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('đơn của cụm sân: kiểm tra chữ ký bằng KHÓA CỦA CỤM SÂN rồi mới xác nhận cọc', async () => {
    const res = await post(payload(111))

    expect(res.status).toBe(200)
    expect(verifyPaymentWebhook).toHaveBeenCalledWith(expect.anything(), CLUB_CREDS)
    expect(settlePayment).toHaveBeenCalledWith({ orderCode: 111, paidAmount: 30000, reference: 'TF99' })
  })

  it('đơn thu hộ qua kênh nền tảng: dùng khóa nền tảng', async () => {
    await post(payload(222))
    expect(verifyPaymentWebhook).toHaveBeenCalledWith(expect.anything(), PLATFORM_CREDS)
  })

  it('chữ ký sai → 401, không xác nhận cọc', async () => {
    verifyPaymentWebhook.mockResolvedValue(null)
    const res = await post(payload(111))
    expect(res.status).toBe(401)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('chữ ký hợp lệ nhưng orderCode đã ký khác với orderCode trong body → 401', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 999, amount: 30000, reference: 'x', success: true })
    expect((await post(payload(111))).status).toBe(401)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('đơn giả lập (không có khóa) không thể xác nhận bằng webhook → 401', async () => {
    credentialsForStoredChannel.mockResolvedValue(null)
    expect((await post(payload(111))).status).toBe(401)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('giao dịch báo không thành công → 200 nhưng không xác nhận', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 111, amount: 30000, reference: 'r', success: false })
    expect((await post(payload(111))).status).toBe(200)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('thanh toán thuê bao: dùng khóa nền tảng và gọi settleSubscription', async () => {
    const res = await post(payload(333))

    expect(res.status).toBe(200)
    expect(verifyPaymentWebhook).toHaveBeenCalledWith(expect.anything(), PLATFORM_CREDS)
    expect(settleSubscription).toHaveBeenCalledWith({ orderCode: 333, paidAmount: 30000, reference: 'TF99' })
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('lỗi hệ thống / thiếu tiền được trả đúng mã để PayOS biết xử lý', async () => {
    settlePayment.mockResolvedValue({ ok: false, status: 500, error: 'db down' })
    expect((await post(payload(111))).status).toBe(500)
    settlePayment.mockResolvedValue({ ok: false, status: 400, error: 'thiếu tiền' })
    expect((await post(payload(111))).status).toBe(400)
  })
})
