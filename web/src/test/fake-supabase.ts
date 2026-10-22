/**
 * Supabase giả lập trong bộ nhớ, chỉ đủ cho các lệnh mà lib/payments.ts dùng.
 * Mục đích: test luồng nghiệp vụ mà không cần database thật.
 */

type Row = Record<string, unknown>

interface DbError {
  code?: string
  message: string
}

export interface FakeDb {
  tables: Record<string, Row[]>
  /** Ép một thao tác UPDATE trên bảng ghi lỗi (để test nhánh lỗi), vd { bookings: { code: '23P01', message: '...' } } */
  failUpdate: Record<string, DbError | undefined>
  /** Hàm RPC giả: tên → (tham số) => kết quả */
  rpc: Record<string, (args: Record<string, unknown>) => { data: unknown; error: DbError | null }>
  /** Nhật ký các lệnh đã chạy, để kiểm tra */
  log: string[]
}

export function createFakeDb(tables: Record<string, Row[]>): FakeDb {
  return { tables, failUpdate: {}, rpc: {}, log: [] }
}

export function createFakeClient(db: FakeDb) {
  return {
    async rpc(name: string, args: Record<string, unknown> = {}) {
      const handler = db.rpc[name]
      db.log.push(`rpc ${name}`)
      return handler ? handler(args) : { data: null, error: { message: `rpc ${name} chưa được giả lập` } }
    },
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = []
      let mode: 'select' | 'update' | 'insert' = 'select'
      let patch: Row = {}
      let wantRows = false

      const matching = () => (db.tables[table] ?? []).filter((r) => filters.every((f) => f(r)))

      const run = (single: boolean) => {
        if (mode === 'update') {
          const failure = db.failUpdate[table]
          if (failure) {
            db.log.push(`update ${table} -> FAIL ${failure.code}`)
            return { data: null, error: failure }
          }
          const rows = matching()
          rows.forEach((r) => Object.assign(r, patch))
          db.log.push(`update ${table} (${rows.length}) ${JSON.stringify(patch)}`)
          return { data: wantRows ? rows.map((r) => ({ id: r.id })) : null, error: null }
        }
        const rows = matching()
        return { data: single ? (rows[0] ?? null) : rows, error: null }
      }

      const chain = {
        select() {
          wantRows = true
          return chain
        },
        update(p: Row) {
          mode = 'update'
          patch = p
          return chain
        },
        eq(col: string, val: unknown) {
          filters.push((r) => r[col] === val)
          return chain
        },
        in(col: string, vals: unknown[]) {
          filters.push((r) => vals.includes(r[col]))
          return chain
        },
        maybeSingle: async () => run(true),
        single: async () => run(true),
        // Cho phép `await builder` trực tiếp (update không có .select())
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(run(false)).then(resolve, reject)
        },
      }
      return chain
    },
  }
}
