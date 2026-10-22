import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const verifyPaymentWebhook = vi.fn()
const settlePayment = vi.fn()

vi.mock('@/lib/payos', () => ({ verifyPaymentWebhook: (b: unknown) => verifyPaymentWebhook(b) }))
vi.mock('@/lib/payments', () => ({ settlePayment: (a: unknown) => settlePayment(a) }))

import { POST } from './route'

const post = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/payos/webhook', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  )

beforeEach(() => {
  verifyPaymentWebhook.mockReset()
  settlePayment.mockReset()
})

describe('POST /api/payos/webhook', () => {
  it('body không phải JSON → 400', async () => {
    const res = await post('không phải json {{{')
    expect(res.status).toBe(400)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('KHÔNG tin orderCode trong body khi thiếu chữ ký hợp lệ → 401, không xác nhận cọc', async () => {
    verifyPaymentWebhook.mockResolvedValue(null)

    const res = await post({ orderCode: 10000001, data: { orderCode: 10000001, amount: 1 } })

    expect(res.status).toBe(401)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('giao dịch báo không thành công → 200 nhưng không xác nhận cọc', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 1, amount: 100, reference: 'r', success: false })

    const res = await post({ any: 'thing' })

    expect(res.status).toBe(200)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it('chữ ký hợp lệ → chuyển orderCode, số tiền và mã tham chiếu cho settlePayment', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 10000001, amount: 30000, reference: 'TF99', success: true })
    settlePayment.mockResolvedValue({ ok: true })

    const res = await post({ signed: true })

    expect(res.status).toBe(200)
    expect(settlePayment).toHaveBeenCalledWith({ orderCode: 10000001, paidAmount: 30000, reference: 'TF99' })
  })

  it('đơn không tồn tại (PayOS gửi payload thử khi đăng ký URL) → vẫn 200', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 123, amount: 2000, reference: 'test', success: true })
    settlePayment.mockResolvedValue({ ok: false, status: 404, error: 'không có' })

    expect((await post({})).status).toBe(200)
  })

  it('lỗi hệ thống → trả 5xx để PayOS gọi lại', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 1, amount: 100, reference: 'r', success: true })
    settlePayment.mockResolvedValue({ ok: false, status: 500, error: 'db down' })

    expect((await post({})).status).toBe(500)
  })

  it('số tiền không khớp → 400', async () => {
    verifyPaymentWebhook.mockResolvedValue({ orderCode: 1, amount: 100, reference: 'r', success: true })
    settlePayment.mockResolvedValue({ ok: false, status: 400, error: 'thiếu tiền' })

    expect((await post({})).status).toBe(400)
  })
})
