// Đăng ký (xác nhận) Webhook URL với PayOS.
//
//   node --env-file=.env.local scripts/register-payos-webhook.mjs https://ten-mien-cua-ban.vercel.app/api/payos/webhook
//
// PayOS sẽ gửi một request thử có chữ ký tới URL; endpoint của dự án phải trả 200 thì mới đăng ký thành công.
// Cần PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong môi trường.
import { PayOS } from '@payos/node'

const webhookUrl = process.argv[2]
const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env

if (!webhookUrl || !/^https:\/\/.+\/api\/payos\/webhook\/?$/.test(webhookUrl)) {
  console.error('Thiếu hoặc sai URL. Dạng đúng: https://<tên-miền>/api/payos/webhook (bắt buộc https)')
  process.exit(1)
}
if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
  console.error('Thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY. Điền vào web/.env.local trước.')
  process.exit(1)
}

const payos = new PayOS({ clientId: PAYOS_CLIENT_ID, apiKey: PAYOS_API_KEY, checksumKey: PAYOS_CHECKSUM_KEY })

try {
  const res = await payos.webhooks.confirm(webhookUrl)
  console.log('✅ Đã đăng ký webhook:', res.webhookUrl)
  console.log('   Tài khoản nhận tiền:', res.accountName, '-', res.accountNumber, '-', res.shortName || res.name)
} catch (err) {
  console.error('❌ PayOS không xác nhận được webhook:', err?.message ?? err)
  console.error('   Kiểm tra: web đã deploy chưa, URL có đúng không, và Vercel Deployment Protection có đang chặn không.')
  process.exit(1)
}
