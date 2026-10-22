import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeClient, createFakeDb, type FakeDb } from '@/test/fake-supabase'

const notifyUser = vi.fn()
let db: FakeDb

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createFakeClient(db) }))
vi.mock('@/lib/notify', () => ({ notifyUser: (...a: unknown[]) => notifyUser(...a) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { settleSubscription } from './subscriptions'

const ORDER = 10000042

function seed(status = 'pending', amount = 199000) {
  db = createFakeDb({
    subscription_payments: [{ id: 'sub-1', order_code: ORDER, club_id: 'club-1', user_id: 'owner-1', amount, status }],
  })
  db.rpc.apply_subscription_payment = () => ({
    data: [{ club_id: 'club-1', user_id: 'owner-1', plan_until: '2026-12-01T00:00:00Z' }],
    error: null,
  })
}

beforeEach(() => notifyUser.mockReset())

describe('settleSubscription', () => {
  it('404 khi không có giao dịch', async () => {
    seed()
    expect(await settleSubscription({ orderCode: 1, reference: 'x' })).toMatchObject({ ok: false, status: 404 })
  })

  it('thanh toán đủ: gia hạn gói và báo chủ sân', async () => {
    seed()
    const r = await settleSubscription({ orderCode: ORDER, paidAmount: 199000, reference: 'TF1' })

    expect(r).toEqual({ ok: true })
    expect(db.log).toContain('rpc apply_subscription_payment')
    expect(notifyUser).toHaveBeenCalledTimes(1)
    expect(notifyUser.mock.calls[0][0]).toMatchObject({ userId: 'owner-1', link: '/owner/billing' })
  })

  it('đã thanh toán trước đó: không gia hạn lần nữa, không báo trùng', async () => {
    seed('paid')
    const r = await settleSubscription({ orderCode: ORDER, paidAmount: 199000, reference: 'TF1' })

    expect(r).toMatchObject({ ok: true, alreadyPaid: true })
    expect(db.log).not.toContain('rpc apply_subscription_payment')
    expect(notifyUser).not.toHaveBeenCalled()
  })

  it('hàm SQL báo đã áp trước đó (webhook gọi song song) → không báo trùng', async () => {
    seed()
    db.rpc.apply_subscription_payment = () => ({ data: [], error: null })

    expect(await settleSubscription({ orderCode: ORDER, paidAmount: 199000, reference: 'x' })).toMatchObject({
      ok: true,
      alreadyPaid: true,
    })
    expect(notifyUser).not.toHaveBeenCalled()
  })

  it('chuyển thiếu tiền → 400, không gia hạn', async () => {
    seed()
    const r = await settleSubscription({ orderCode: ORDER, paidAmount: 100000, reference: 'x' })

    expect(r).toMatchObject({ ok: false, status: 400 })
    expect(db.log).not.toContain('rpc apply_subscription_payment')
  })

  it('lỗi database → 500 để PayOS gọi lại', async () => {
    seed()
    db.rpc.apply_subscription_payment = () => ({ data: null, error: { message: 'down' } })

    expect(await settleSubscription({ orderCode: ORDER, paidAmount: 199000, reference: 'x' })).toMatchObject({
      ok: false,
      status: 500,
    })
  })
})
