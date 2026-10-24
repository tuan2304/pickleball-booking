import { describe, expect, it } from 'vitest'
import { createFakeClient, createFakeDb } from '@/test/fake-supabase'
import { getClubDeletionBlocker, getCourtDeletionBlocker } from './deletion-guards'

type Tables = Record<string, Record<string, unknown>[]>

const client = (tables: Tables) =>
  createFakeClient(createFakeDb({ courts: [], bookings: [], payments: [], subscription_payments: [], ...tables })) as never

describe('getCourtDeletionBlocker', () => {
  it('sân chưa từng có đơn thì xóa được', async () => {
    expect(await getCourtDeletionBlocker(client({}), 'c1')).toBeNull()
  })

  it.each(['pending', 'confirmed', 'completed'])('sân có đơn %s thì chặn xóa', async (status) => {
    const db = client({ bookings: [{ id: 'b1', court_id: 'c1', status }] })
    expect(await getCourtDeletionBlocker(db, 'c1')).toMatch(/tạm ngưng/)
  })

  it('đơn đã hủy và chưa ai trả tiền thì vẫn xóa được', async () => {
    const db = client({ bookings: [{ id: 'b1', court_id: 'c1', status: 'cancelled' }] })
    expect(await getCourtDeletionBlocker(db, 'c1')).toBeNull()
  })

  it('đơn đã hủy nhưng khách đã chuyển tiền thì chặn (cần hoàn/đối soát)', async () => {
    const db = client({
      bookings: [{ id: 'b1', court_id: 'c1', status: 'cancelled' }],
      payments: [{ id: 'p1', booking_id: 'b1', status: 'paid' }],
    })
    expect(await getCourtDeletionBlocker(db, 'c1')).not.toBeNull()
  })

  it('đơn của sân khác không ảnh hưởng', async () => {
    const db = client({ bookings: [{ id: 'b1', court_id: 'other', status: 'confirmed' }] })
    expect(await getCourtDeletionBlocker(db, 'c1')).toBeNull()
  })
})

describe('getClubDeletionBlocker', () => {
  const courts = [{ id: 'c1', club_id: 'club-1' }, { id: 'c2', club_id: 'club-1' }]

  it('cụm sân trống thì xóa được', async () => {
    expect(await getClubDeletionBlocker(client({ courts }), 'club-1')).toBeNull()
  })

  it('có đơn ở bất kỳ sân con nào thì chặn', async () => {
    const db = client({ courts, bookings: [{ id: 'b', court_id: 'c2', status: 'confirmed' }] })
    expect(await getClubDeletionBlocker(db, 'club-1')).not.toBeNull()
  })

  it('đã trả thuê bao thì chặn, chưa trả thì cho xóa', async () => {
    const paid = client({ courts, subscription_payments: [{ id: 's', club_id: 'club-1', status: 'paid' }] })
    expect(await getClubDeletionBlocker(paid, 'club-1')).not.toBeNull()
    const pending = client({ courts, subscription_payments: [{ id: 's', club_id: 'club-1', status: 'pending' }] })
    expect(await getClubDeletionBlocker(pending, 'club-1')).toBeNull()
  })
})
