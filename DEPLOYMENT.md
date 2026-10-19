# 🚀 Hướng Dẫn Triển Khai Production (SportArena Web)

Tài liệu hướng dẫn triển khai nền tảng **SportArena Web** lên môi trường Production với đầy đủ tính năng Real-time và thanh toán VietQR PayOS.

---

## 🌟 CÁCH 1: Triển khai qua Vercel & GitHub (Khuyên Dùng Nhất)
> **Ưu điểm:** Miễn phí, tốc độ cao (CDN toàn cầu), hỗ trợ Server Actions / Edge Middleware tối đa, tự động deploy (CI/CD) mỗi khi push code lên GitHub.

Dự án hiện đã được liên kết với GitHub Repository:  
👉 **`https://github.com/tuan2304/pickleball-booking.git`**

### Bước 1: Đẩy phiên bản code mới nhất lên GitHub
Chạy các lệnh sau trong terminal tại thư mục gốc `d:\myproject`:
```bash
git add .
git commit -m "feat: complete Phase 1-7 (Web, Realtime, PayOS, Mobile Expo)"
git push origin master
```

### Bước 2: Kết nối với Vercel
1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub của bạn.
2. Nhấn nút **"Add New..."** $\rightarrow$ chọn **"Project"**.
3. Tìm và chọn repository: **`tuan2304/pickleball-booking`** $\rightarrow$ bấm **"Import"**.

### Bước 3: Cấu hình Project trên Vercel
- **Framework Preset:** `Next.js`
- **Root Directory:** Bấm **Edit** và chọn thư mục **`web`** *(Rất quan trọng vì dự án là Monorepo)*.

### Bước 4: Thêm Biến Môi Trường (Environment Variables)
Sao chép các biến sau từ file `.env.local` vào mục **Environment Variables** trên Vercel:

| Tên biến | Giá trị mẫu | Mục đích |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hlaawnushcfuzidzwvww.supabase.co` | Kết nối Supabase Cloud |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Key anon trong .env.local)* | Xác thực phía Client |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Key service_role trong .env.local)* | Quyền Admin thao tác Webhook |
| `PAYOS_CLIENT_ID` | *(Client ID từ payos.vn)* | Cổng VietQR PayOS |
| `PAYOS_API_KEY` | *(API Key từ payos.vn)* | Cổng VietQR PayOS |
| `PAYOS_CHECKSUM_KEY` | *(Checksum Key từ payos.vn)* | Xác thực chữ ký số Webhook |
| `NEXT_PUBLIC_APP_URL` | `https://tên-dự-án.vercel.app` | Domain chính thức của bạn |

### Bước 5: Bấm "Deploy"
Vercel sẽ tự động build và cung cấp cho bạn một domain HTTPS miễn phí (ví dụ: `https://sportarena.vercel.app`).

### Bước 6: Cấu hình Webhook trên PayOS
1. Đăng nhập vào [https://my.payos.vn](https://my.payos.vn).
2. Vào mục **Kênh thanh toán** $\rightarrow$ chọn kênh của bạn.
3. Trong ô **Webhook URL**, điền URL chính thức:
   ```
   https://tên-dự-án.vercel.app/api/payos/webhook
   ```
4. Bấm **Xác nhận / Lưu**. Giờ đây mỗi khi khách quét mã VietQR và chuyển khoản, PayOS sẽ gọi ngay tới webhook này để cập nhật trạng thái đơn đặt và phát chuông thông báo Real-time!

---

## 🐳 CÁCH 2: Triển khai bằng Docker trên VPS (Self-hosted)

Nếu bạn có VPS riêng (Ubuntu, Debian, CentOS...):

### 1. Build Docker image:
```bash
cd web
docker build -t sportarena-web .
```

### 2. Chạy container:
```bash
docker run -d \
  --name sportarena \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://hlaawnushcfuzidzwvww.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-key" \
  -e PAYOS_CLIENT_ID="your-client-id" \
  -e PAYOS_API_KEY="your-api-key" \
  -e PAYOS_CHECKSUM_KEY="your-checksum-key" \
  -e NEXT_PUBLIC_APP_URL="https://yourdomain.com" \
  sportarena-web
```

---

## 🔒 Kiểm tra & Bảo mật sau khi Triển khai:
1. **Kiểm tra đăng nhập:** Thử đăng nhập bằng tài khoản `owner@sportarena.vn` (mật khẩu `123456`) để vào Dashboard Chủ sân.
2. **Kiểm tra Real-time:** Mở 2 tab trình duyệt ẩn danh: Tab 1 mở màn hình chi tiết kèo, Tab 2 thực hiện xin tham gia để kiểm tra danh sách tự cập nhật tức thì.
3. **Thanh toán VietQR:** Thử đặt một khung giờ và quét mã QR giả lập để kiểm tra xác nhận cọc thành công.

