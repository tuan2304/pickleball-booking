import { PayOS } from '@payos/node'

const isProduction = process.env.NODE_ENV === 'production'

/** Bộ khóa của một kênh thanh toán PayOS (của nền tảng, hoặc của riêng một cụm sân). */
export interface PayosCredentials {
  clientId: string
  apiKey: string
  checksumKey: string
}

/** Kênh PayOS của nền tảng (biến môi trường). Dùng cho thuê bao và cho cụm sân chưa tự kết nối PayOS. */
export function getPlatformCredentials(): PayosCredentials | null {
  const clientId = process.env.PAYOS_CLIENT_ID || ''
  const apiKey = process.env.PAYOS_API_KEY || ''
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY || ''
  return clientId && apiKey && checksumKey ? { clientId, apiKey, checksumKey } : null
}

function isPayOSConfigured(): boolean {
  return getPlatformCredentials() !== null
}

/**
 * Chế độ giả lập (nút "xác nhận ngay", QR mẫu) chỉ tồn tại khi KHÔNG phải production
 * và nền tảng chưa cấu hình khóa PayOS. Ở production luôn là false.
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

function clientFor(creds: PayosCredentials): PayOS {
  return new PayOS({ clientId: creds.clientId, apiKey: creds.apiKey, checksumKey: creds.checksumKey })
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

/**
 * Tạo link/QR thanh toán bằng đúng kênh `creds`.
 * `creds = null` nghĩa là không có kênh thật: ở production báo lỗi, ở dev dùng QR mẫu để thử luồng.
 * Đã có `creds` mà PayOS lỗi thì luôn báo lỗi, không bao giờ dựng QR dự phòng (khách có thể chuyển nhầm tài khoản).
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams,
  creds: PayosCredentials | null
): Promise<PaymentLinkResult> {
  const description = params.description.slice(0, 25)

  if (creds) {
    try {
      const res = await clientFor(creds).paymentRequests.create({
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
      throw new PaymentGatewayError('Cổng thanh toán đang gặp sự cố, vui lòng thử lại sau ít phút.', { cause: err })
    }
  }

  if (isProduction) {
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

/** Xác thực chữ ký webhook bằng khóa của đúng kênh. Trả về null nếu sai chữ ký. */
export async function verifyPaymentWebhook(body: unknown, creds: PayosCredentials): Promise<VerifiedWebhook | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await clientFor(creds).webhooks.verify(body as any)
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

export interface RegisteredWebhook {
  webhookUrl: string
  accountName: string
  accountNumber: string
  bankName: string
}

/**
 * Đăng ký Webhook URL cho một kênh PayOS. Đồng thời là phép thử khóa: sai khóa thì PayOS từ chối.
 * PayOS sẽ gửi một request thử tới URL nên endpoint phải đang chạy.
 */
export async function registerWebhook(url: string, creds: PayosCredentials): Promise<RegisteredWebhook> {
  try {
    const res = await clientFor(creds).webhooks.confirm(url)
    return {
      webhookUrl: res.webhookUrl,
      accountName: res.accountName,
      accountNumber: res.accountNumber,
      bankName: res.shortName || res.name,
    }
  } catch (err) {
    console.error('Đăng ký webhook PayOS thất bại:', err)
    throw new PaymentGatewayError(
      'PayOS không chấp nhận khóa hoặc không gọi được webhook. Kiểm tra lại 3 khóa và đảm bảo web đang chạy công khai.',
      { cause: err }
    )
  }
}
