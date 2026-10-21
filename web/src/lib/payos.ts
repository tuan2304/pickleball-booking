import { PayOS } from '@payos/node'

const clientId = process.env.PAYOS_CLIENT_ID || ''
const apiKey = process.env.PAYOS_API_KEY || ''
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || ''

const isProduction = process.env.NODE_ENV === 'production'

let payosInstance: PayOS | null = null
if (clientId && apiKey && checksumKey) {
  try {
    payosInstance = new PayOS({ clientId, apiKey, checksumKey })
  } catch (err) {
    console.error('Không khởi tạo được PayOS client:', err)
  }
}

export function isPayOSConfigured(): boolean {
  return payosInstance !== null
}

/**
 * Chế độ giả lập (nút "xác nhận ngay", QR mẫu) chỉ tồn tại khi KHÔNG phải production
 * và chưa cấu hình khóa PayOS. Ở production luôn là false.
 */
export function isPaymentSimulationEnabled(): boolean {
  return !isProduction && !isPayOSConfigured()
}

export class PaymentGatewayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PaymentGatewayError'
  }
}

export interface CreatePaymentLinkParams {
  orderCode: number
  amount: number
  /** Nội dung chuyển khoản, PayOS giới hạn 25 ký tự, nên dùng ASCII */
  description: string
  returnUrl: string
  cancelUrl: string
  /** Thời điểm link hết hạn (giây Unix) */
  expiredAt?: number
}

export interface PaymentLinkResult {
  orderCode: number
  amount: number
  description: string
  checkoutUrl: string
  /** URL ảnh VietQR để hiển thị trong thẻ <img> */
  qrImageUrl: string
  bin: string
  accountNumber: string
  accountName: string
  paymentLinkId: string | null
  simulated: boolean
}

function buildVietQrImageUrl(p: {
  bin: string
  accountNumber: string
  accountName: string
  amount: number
  description: string
}) {
  const qs = new URLSearchParams({
    amount: String(p.amount),
    addInfo: p.description,
    accountName: p.accountName,
  })
  return `https://img.vietqr.io/image/${p.bin}-${p.accountNumber}-compact2.png?${qs.toString()}`
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
  const description = params.description.slice(0, 25)

  if (payosInstance) {
    try {
      const res = await payosInstance.paymentRequests.create({
        orderCode: params.orderCode,
        amount: params.amount,
        description,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        expiredAt: params.expiredAt,
      })
      return {
        orderCode: res.orderCode,
        amount: res.amount,
        description: res.description,
        checkoutUrl: res.checkoutUrl,
        // res.qrCode là chuỗi VietQR, không phải URL ảnh → dựng ảnh từ thông tin tài khoản
        qrImageUrl: buildVietQrImageUrl({
          bin: res.bin,
          accountNumber: res.accountNumber,
          accountName: res.accountName,
          amount: res.amount,
          description: res.description,
        }),
        bin: res.bin,
        accountNumber: res.accountNumber,
        accountName: res.accountName,
        paymentLinkId: res.paymentLinkId ?? null,
        simulated: false,
      }
    } catch (err) {
      console.error('Gọi PayOS tạo link thanh toán thất bại:', err)
      // Ở production tuyệt đối không dựng QR dự phòng: khách có thể chuyển tiền vào tài khoản không phải của hệ thống
      if (isProduction) {
        throw new PaymentGatewayError('Cổng thanh toán đang gặp sự cố, vui lòng thử lại sau ít phút.', { cause: err })
      }
    }
  } else if (isProduction) {
    throw new PaymentGatewayError('Hệ thống thanh toán chưa được cấu hình.')
  }

  // ---- Chỉ chạy khi phát triển (dev) ----
  const mock = { bin: '970422', accountNumber: '0000000000', accountName: 'SPORTARENA DEV' }
  return {
    orderCode: params.orderCode,
    amount: params.amount,
    description,
    checkoutUrl: `${params.returnUrl}?simulated=true`,
    qrImageUrl: buildVietQrImageUrl({ ...mock, amount: params.amount, description }),
    ...mock,
    paymentLinkId: null,
    simulated: true,
  }
}

export interface VerifiedWebhook {
  orderCode: number
  amount: number
  reference: string
  success: boolean
}

/** Xác thực chữ ký webhook. Trả về null nếu sai chữ ký hoặc chưa cấu hình PayOS. */
export async function verifyPaymentWebhook(body: unknown): Promise<VerifiedWebhook | null> {
  if (!payosInstance) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await payosInstance.webhooks.verify(body as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webhook = body as any
    return {
      orderCode: Number(data.orderCode),
      amount: Number(data.amount),
      reference: String(data.reference ?? ''),
      success: webhook?.success === true && String(data.code ?? webhook?.code) === '00',
    }
  } catch (err) {
    console.warn('Chữ ký webhook PayOS không hợp lệ:', err instanceof Error ? err.message : err)
    return null
  }
}
