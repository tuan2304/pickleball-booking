// Xử lý các tài khoản mẫu (@sportarena.vn, mật khẩu cũ 123456) trên database đang trỏ tới bởi .env.local.
//
//   node --env-file=.env.local scripts/secure-seed-accounts.mjs            # chỉ liệt kê, KHÔNG sửa gì
//   node --env-file=.env.local scripts/secure-seed-accounts.mjs --apply    # đổi mật khẩu sang chuỗi ngẫu nhiên
//
// --apply đặt mật khẩu ngẫu nhiên 32 ký tự và KHÔNG in ra, nghĩa là các tài khoản mẫu không còn đăng nhập được
// (muốn dùng lại thì đặt mật khẩu mới trong Supabase Dashboard > Authentication > Users). Dữ liệu (cụm sân,
// đơn đặt...) được giữ nguyên. Chỉ đụng tới email kết thúc bằng @sportarena.vn.
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (chạy với --env-file=.env.local)')
  process.exit(1)
}

const apply = process.argv.includes('--apply')
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const found = []
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) {
    console.error('Không liệt kê được người dùng:', error.message)
    process.exit(1)
  }
  found.push(...data.users.filter((u) => (u.email ?? '').toLowerCase().endsWith('@sportarena.vn')))
  if (data.users.length < 200) break
}

console.log(`Database: ${new URL(url).host}`)
console.log(`Tìm thấy ${found.length} tài khoản mẫu:`)
for (const u of found) console.log(`  - ${u.email}  (đăng nhập gần nhất: ${u.last_sign_in_at ?? 'chưa bao giờ'})`)

if (!apply) {
  console.log('\nĐây là chế độ xem trước, chưa thay đổi gì. Thêm --apply để đổi mật khẩu.')
  process.exit(0)
}

let ok = 0
for (const u of found) {
  const { error } = await admin.auth.admin.updateUserById(u.id, { password: randomBytes(24).toString('base64url') })
  if (error) console.error(`  ✗ ${u.email}: ${error.message}`)
  else ok++
}
console.log(`\nĐã đổi mật khẩu ngẫu nhiên cho ${ok}/${found.length} tài khoản.`)
