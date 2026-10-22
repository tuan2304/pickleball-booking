import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeClient, createFakeDb, type FakeDb } from '@/test/fake-supabase'

const notifyUser = vi.fn()
let db: FakeDb

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createFakeClient(db) }))
vi.mock('@/lib/notify', () => ({ notifyUser: (...args: unknown[]) => notifyUser(...args) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { settlePayment } from './payments'

const ORDER = 10000001

function seed(overrides: { paymentStatus?: string; bookingStatus?: string; amount?: number } = {}) {
  db = createFakeDb({
    payments: [
      {
        id: 'pay-1',
        order_code: ORDER,
        booking_id: 'bk-1',
        user_id: 'player-1',
        amount: overrides.amount ?? 30000,
        status: overrides.paymentStatus ?? 'pending',
        metadata: {},
        booking: {
          id: 'bk-1',
          status: overrides.bookingStatus ?? 'pending',
          court: { name: 'Sân 1', club: { name: 'CLB Thảo Điền', owner_id: 'owner-1' } },
        },
      },
    ],
    bookings: [{ id: 'bk-1', status: overrides.bookingStatus ?? 'pending' }],
    matches: [{ id: 'm-1', booking_id: 'bk-1', status: 'cancelled' }],
  })
}

const payment = () => db.tables.payments[0]
const booking = () => db.tables.bookings[0]
const notified = () => notifyUser.mock.calls.map((c) => (c[0] as { userId: string }).userId)

beforeEach(() => {
  notifyUser.mockReset()
})

describe('settlePayment', () => {
  it('trả 404 khi không có đơn thanh toán tương ứng', async () => {
    seed()
    const r = await settlePayment({ orderCode: 999, reference: 'x' })
    expect(r).toMatchObject({ ok: false, status: 404 })
    expect(notifyUser).not.toHaveBeenCalled()
  })

  it('xác nhận cọc: payment → paid, booking → confirmed, báo cả người chơi và chủ sân', async () => {
    seed()
    const r = await settlePayment({ orderCode: ORDER, paidAmount: 30000, reference: 'TF123' })

    expect(r).toEqual({ ok: true, needsRefund: false })
    expect(payment().status).toBe('paid')
    expect(payment().payos_transaction_id).toBe('TF123')
    expect(booking().status).toBe('confirmed')
    expect(notified().sort()).toEqual(['owner-1', 'player-1'])
  })

  it('PayOS gọi lại webhook: chỉ xử lý một lần, không báo trùng', async () => {
    seed()
    await settlePayment({ orderCode: ORDER, paidAmount: 30000, reference: 'TF123' })
    notifyUser.mockClear()

    const again = await settlePayment({ orderCode: ORDER, paidAmount: 30000, reference: 'TF123' })
    expect(again).toMatchObject({ ok: true, alreadyPaid: true })
    expect(notifyUser).not.toHaveBeenCalled()
  })

  it('chuyển thiếu tiền thì từ chối và không đụng vào đơn', async () => {
    seed({ amount: 30000 })
    const r = await settlePayment({ orderCode: ORDER, paidAmount: 20000, reference: 'TF1' })

    expect(r).toMatchObject({ ok: false, status: 400 })
    expect(payment().status).toBe('pending')
    expect(booking().status).toBe('pending')
    expect(notifyUser).not.toHaveBeenCalled()
  })

  it('chuyển dư tiền vẫn được chấp nhận', async () => {
    seed({ amount: 30000 })
    const r = await settlePayment({ orderCode: ORDER, paidAmount: 50000, reference: 'TF1' })
    expect(r).toMatchObject({ ok: true })
    expect(payment().status).toBe('paid')
  })

  it('tiền về sau khi đơn đã hết hạn nhưng sân còn trống: giành lại sân và mở lại kèo', async () => {
    seed({ paymentStatus: 'cancelled', bookingStatus: 'cancelled' })
    const r = await settlePayment({ orderCode: ORDER, paidAmount: 30000, reference: 'LATE' })

    expect(r).toMatchObject({ ok: true, needsRefund: false })
    expect(booking().status).toBe('confirmed')
    expect(payment().status).toBe('paid')
    expect(db.tables.matches[0].status).toBe('open')
  })

  it('tiền về muộn mà sân đã có người khác đặt: ghi nhận để hoàn tiền, chỉ báo người chơi', async () => {
    seed({ paymentStatus: 'cancelled', bookingStatus: 'cancelled' })
    db.failUpdate.bookings = { code: '23P01', message: 'conflicting key value violates exclusion constraint' }

    const r = await settlePayment({ orderCode: ORDER, paidAmount: 30000, reference: 'LATE' })

    expect(r).toMatchObject({ ok: true, needsRefund: true })
    expect(payment().status).toBe('paid')
    expect(payment().metadata).toMatchObject({ needs_refund: true })
    expect(booking().status).toBe('cancelled')
    expect(notified()).toEqual(['player-1'])
  })

  it('lỗi database khi xác nhận booking: trả 500 để PayOS gọi lại và hoàn payment về pending', async () => {
    seed()
    db.failUpdate.bookings = { code: '57P01', message: 'connection lost' }

    const r = await settlePayment({ orderCode: ORDER, paidAmount: 30000, reference: 'TF1' })

    expect(r).toMatchObject({ ok: false, status: 500 })
    expect(payment().status).toBe('pending')
    expect(notifyUser).not.toHaveBeenCalled()
  })
})
