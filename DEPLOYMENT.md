# 🚀 Hướng Dẫn Triển Khai Production (SportArena Web)

Tài liệu hướng dẫn triển khai nền tảng **SportArena Web** lên môi trường Production với đầy đủ tính năng Real-time và thanh toán VietQR PayOS.

---

## 🌟 CÁCH 1: Triển khai qua Vercel & GitHub (Khuyên Dùng Nhất)
> **Ưu điểm:** Miễn phí, tốc độ cao (CDN toàn cầu), hỗ trợ Server Actions / Edge Middleware tối đa, tự động deploy (CI/CD) mỗi khi push code lên GitHub.

Dự án hiện đã được liên kết với GitHub Repository:  
👉 **`https://github.com/tuan2304/pickleball-booking.git`**

### Bước 0: Áp migration Giai đoạn 10 (BẮT BUỘC, làm TRƯỚC khi deploy code mới)
Migration [20261021000000_phase10_hardening.sql](supabase/migrations/20261021000000_phase10_hardening.sql) khóa quyền ghi trực tiếp vào `bookings`, `payments`, `matches`... Code cũ sẽ lỗi nếu chạy với DB đã khóa, nên hãy áp migration rồi deploy code mới ngay sau đó.

```bash
supabase db push
```
Sau đó vào **Supabase Dashboard → Database → Extensions** và bật **`pg_cron`** (nếu migration chưa tự bật được). Kiểm tra bằng:
```sql
select jobname, schedule from cron.job;  -- phải thấy 'expire-pending-bookings' chạy mỗi phút
```
> Nếu chưa bật `pg_cron`, hệ thống vẫn tự dọn đơn quá hạn mỗi khi có người đặt sân, nhưng nên bật để sân được nhả đúng hạn.

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
| `SUPABASE_SERVICE_ROLE_KEY` | *(Key service_role trong .env.local)* | **Bắt buộc.** Server ghi đơn đặt, thanh toán, thông báo (không bao giờ đưa vào mobile/client) |
| `PAYOS_CLIENT_ID` | *(Client ID từ payos.vn)* | **Bắt buộc ở production.** Thiếu 3 khóa PayOS thì không thể đặt sân (không còn QR dự phòng) |
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

## 💳 Cài đặt PayOS (từng bước)

> Tên mục trên giao diện PayOS có thể khác đôi chút theo thời gian, nhưng các bước giữ nguyên.

### 1. Tạo tài khoản và kênh thanh toán
1. Vào [https://my.payos.vn](https://my.payos.vn) đăng ký bằng email, xác minh tài khoản.
2. Tạo một **Tổ chức** (cá nhân hoặc doanh nghiệp đều được), rồi tạo **Kênh thanh toán**.
3. **Liên kết tài khoản ngân hàng** nhận tiền cho kênh đó (PayOS sẽ hướng dẫn xác thực).
4. Trong kênh vừa tạo, lấy 3 giá trị: **Client ID**, **API Key**, **Checksum Key**.

> ⚠️ Toàn bộ tiền cọc của mọi người chơi sẽ về **một tài khoản ngân hàng này** (của nền tảng).
> Việc chia tiền cho từng chủ sân hiện phải làm thủ công ngoài hệ thống.

### 2. Khai báo biến môi trường
| Biến | Giá trị | Ghi chú |
| :--- | :--- | :--- |
| `PAYOS_CLIENT_ID` | Client ID | |
| `PAYOS_API_KEY` | API Key | |
| `PAYOS_CHECKSUM_KEY` | Checksum Key | Dùng để kiểm tra chữ ký webhook |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Webhook ghi kết quả thanh toán vào DB |
| `NEXT_PUBLIC_APP_URL` | `https://<tên-miền-chính>` | **Chỉ một địa chỉ.** Khách được chuyển về đây sau khi thanh toán |

- **Vercel:** Project → Settings → Environment Variables → thêm cho môi trường **Production** → **Redeploy** (đổi biến phải deploy lại mới có hiệu lực).
- **Máy bạn:** điền vào `web/.env.local`. Hiện file này có `NEXT_PUBLIC_APP_URL` là danh sách 10 địa chỉ localhost nối bằng `;`, hãy sửa còn đúng một địa chỉ (`http://localhost:3000`).
  Code vẫn tự lấy địa chỉ đầu tiên nếu bị dán nhiều địa chỉ, nhưng nên để đúng một giá trị.

### 3. Đăng ký Webhook (để hệ thống biết khách đã trả tiền)
Webhook URL của dự án: `https://<tên-miền-chính>/api/payos/webhook`

Cách 1, trên giao diện PayOS: vào kênh thanh toán → ô **Webhook URL** → dán URL → lưu.

Cách 2, bằng script (có kiểm tra luôn endpoint có phản hồi đúng không):
```bash
cd web
npm run payos:webhook -- https://<tên-miền-chính>/api/payos/webhook
```
PayOS gửi một request thử có chữ ký tới URL này. Endpoint trả `200` thì đăng ký thành công.
Nếu thất bại, kiểm tra theo thứ tự:
1. Web đã deploy bản mới chưa (endpoint phải tồn tại).
2. URL dùng `https` và đúng tên miền.
3. **Vercel Deployment Protection** (Settings → Deployment Protection) không được chặn tên miền production; nếu bật cho cả production thì PayOS sẽ nhận `401` từ Vercel.
4. 3 khóa PayOS đã có trên Vercel và đã Redeploy.

### 4. Thử nghiệm với tiền thật (số tiền nhỏ)
PayOS không có chế độ sandbox, nên thử bằng số tiền nhỏ (tối thiểu thường là 2.000 đ):
1. Đăng nhập chủ sân, tạm đặt giá một sân con thấp (ví dụ 5.000 đ/giờ, cọc 100%).
2. Đăng nhập người chơi, đặt một khung giờ, quét QR bằng app ngân hàng và chuyển khoản đúng số tiền.
3. Trong vài giây trang đặt sân phải tự chuyển sang **"Đặt sân thành công"**; chủ sân thấy chuông thông báo.
4. Kiểm tra bảng `payments` có `status = 'paid'` và `bookings` có `status = 'confirmed'`.
5. Đặt lại giá thật cho sân.

### 5. Khi không thấy trạng thái cập nhật
| Triệu chứng | Nguyên nhân thường gặp |
| :--- | :--- |
| Báo lỗi ngay khi bấm giữ chỗ | Thiếu 1 trong 3 khóa PayOS trên môi trường production (production không còn QR giả) |
| QR hiện ra nhưng chuyển khoản xong vẫn "chờ" | Webhook chưa đăng ký / bị Vercel chặn / sai `PAYOS_CHECKSUM_KEY` (xem **Logs** của Vercel, tìm `/api/payos/webhook`: `401` nghĩa là sai chữ ký) |
| Sau khi trả tiền bị đưa về `localhost` | `NEXT_PUBLIC_APP_URL` chưa đặt đúng trên Vercel |
| Trang báo "đã nhận cọc nhưng khung giờ không còn" | Khách trả sau khi đơn đã hết hạn 15 phút và sân đã có người khác đặt; cần hoàn tiền thủ công (`payments.metadata.needs_refund = true`) |

## 🔒 Kiểm tra & Bảo mật sau khi Triển khai:
1. **Webhook:** gửi thử `POST /api/payos/webhook` với body `{"orderCode": 1}` → phải nhận **401** (webhook chỉ chấp nhận payload có chữ ký PayOS hợp lệ).
2. **Thanh toán thật:** đặt một khung giờ, quét QR chuyển khoản số tiền nhỏ → trang tự chuyển "Thành công" và chủ sân nhận chuông thông báo. Trên production **không có** nút giả lập thanh toán.
3. **Real-time:** mở 2 tab ẩn danh: tab 1 mở chi tiết kèo, tab 2 xin tham gia → danh sách tự cập nhật. Chỉ chủ kèo và thành viên đã duyệt mới thấy phòng chat.
4. **Hết hạn giữ chỗ:** đặt sân rồi đóng tab, chờ hơn 15 phút → khung giờ tự mở lại (nhờ `pg_cron`).
5. **Tài khoản mẫu:** các tài khoản seed (`@sportarena.vn`) chỉ dành cho môi trường dev. **Xóa hoặc đổi mật khẩu** trước khi mở cho người dùng thật, và dùng một project Supabase riêng cho production.
6. **Mobile:** tạo `mobile/.env` từ `mobile/.env.example`. Nút "chuyển nhanh tài khoản" chỉ hiện ở bản dev (`__DEV__`).
