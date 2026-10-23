<div align="center">

# SportArena

**Đặt sân và ghép kèo thể thao theo thời gian thực.**
Chống trùng lịch ở tầng database, cọc bằng VietQR, mỗi chủ sân nhận tiền thẳng vào tài khoản của mình.

[Luồng hoạt động](FLOW.md) · [Triển khai](DEPLOYMENT.md) · [Quy chuẩn thiết kế](DESIGN.md) · [Nhật ký phát triển](GEMINI.md)

</div>

---

## Dự án làm gì

| Vai trò | Làm được gì |
| :-- | :-- |
| **Người chơi** | Tìm sân theo môn và khu vực, chọn khung giờ, cọc bằng mã QR, mở hoặc tham gia kèo giao lưu, chat trong kèo, đánh giá sân, gửi yêu cầu hỗ trợ |
| **Chủ sân** | Tạo cụm sân và sân con, đặt bảng giá theo khung giờ, xem lịch đặt realtime, kết nối PayOS riêng để nhận cọc, mua gói Pro |
| **Quản trị nền tảng** | Xem thống kê vận hành, trả lời yêu cầu hỗ trợ của chủ sân và người chơi, gửi thông báo cập nhật, cấp gói Pro |

Ba con số cần nhớ:

- **15 phút**: thời gian giữ chỗ chờ cọc, quá hạn tự nhả.
- **% cọc**: chủ sân tự đặt cho từng sân.
- **0 lần trùng lịch**: Postgres chặn bằng exclusion constraint, không phụ thuộc code.

## Mô hình tiền

- **Tiền cọc đặt sân** đi thẳng vào tài khoản ngân hàng của chủ sân qua kênh PayOS riêng của họ. Cụm sân chưa kết nối PayOS thì chưa nhận đặt sân online. Nền tảng không giữ hộ và không phải đối soát.
- **Doanh thu của nền tảng** là tiền thuê gói Pro, thu qua kênh PayOS của chủ nền tảng (biến môi trường `PAYOS_*`).
- Khóa PayOS của chủ sân được mã hóa AES-256-GCM trước khi lưu và không bao giờ trả về trình duyệt.

## Công nghệ

| Lớp | Công nghệ |
| :-- | :-- |
| Web | Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS v4, shadcn/ui trên Base UI, sonner |
| Backend | Supabase: Postgres, Auth, Row Level Security, Realtime |
| Thanh toán | PayOS v2 (VietQR) và webhook có kiểm tra chữ ký |
| Mobile | Expo, React Native |
| Kiểm thử | Vitest (web), bộ test SQL cho RLS chạy trong Docker |
| CI | GitHub Actions: typecheck, lint, test, build, test database, kiểm tra mobile |

## Cấu trúc thư mục

```
.
├── web/                 Ứng dụng Next.js
│   ├── src/app/         Trang, route API, Server Actions
│   │   ├── admin/       Khu vực quản trị (thống kê, ticket, thông báo, gói dịch vụ)
│   │   ├── owner/       Cổng chủ sân
│   │   ├── support/     Hỗ trợ cho chủ sân và người chơi
│   │   └── api/payos/   Webhook PayOS
│   ├── src/components/  Giao diện
│   ├── src/lib/         Logic dùng chung (có test cạnh file)
│   └── scripts/         Đăng ký webhook, tạo ảnh thương hiệu, seed
├── mobile/              Ứng dụng Expo
├── supabase/
│   ├── migrations/      Schema, RLS, hàm SQL
│   └── tests/           Test bảo mật SQL (run.sh)
├── FLOW.md              Luồng hoạt động có sơ đồ
├── DEPLOYMENT.md        Hướng dẫn triển khai và cài đặt PayOS
├── DESIGN.md            Màu, chữ, logo, giao diện sáng/tối
└── GEMINI.md            Nhật ký quyết định và thay đổi
```

## Chạy trên máy của bạn

Cần Node.js 20 trở lên và một project Supabase.

```bash
git clone https://github.com/tuan2304/pickleball-booking.git
cd pickleball-booking/web
npm install
cp .env.example .env.local     # rồi điền giá trị, xem bảng dưới
npm run dev                    # http://localhost:3000
```

Áp schema lên project Supabase của bạn (cần [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Khi chưa điền khóa PayOS nào, môi trường dev dùng chế độ giả lập (QR mẫu và nút xác nhận) để thử luồng đặt sân. Chế độ này tự tắt ở production.

### Biến môi trường chính

| Biến | Bắt buộc | Ý nghĩa |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có | Kết nối Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Có | Chỉ dùng phía server, **không** thêm `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Production | Tên miền thật, dùng để đăng ký webhook |
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Production | Kênh PayOS của chủ nền tảng, thu tiền thuê gói Pro |
| `PAYMENT_SETTINGS_ENCRYPTION_KEY` | Production | Khóa 32 byte base64 mã hóa khóa PayOS của chủ sân. Đừng đổi sau khi đã có dữ liệu |
| `BILLING_ENFORCED_FROM` | Không | Ngày bắt đầu giới hạn gói Free. Để trống là miễn phí hoàn toàn |
| `PRO_PLAN_PRICE_VND` | Không | Giá gói Pro mỗi tháng |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Không | Bản đồ nhúng chính thức. Không có thì dùng dạng nhúng không cần khóa |

Danh sách đầy đủ và giải thích nằm trong [web/.env.example](web/.env.example). Không commit file `.env.local`.

### Tạo tài khoản quản trị

Vai trò `admin` không tự đăng ký được. Tạo tài khoản bình thường rồi chạy trong Supabase SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'EMAIL_CUA_BAN');
```

Đăng nhập xong sẽ vào thẳng `/admin`.

## Lệnh thường dùng

Chạy trong thư mục `web/`:

| Lệnh | Việc làm |
| :-- | :-- |
| `npm run dev` | Chạy dev server |
| `npm run check` | Typecheck, lint và test, giống CI |
| `npm run build` | Build production |
| `npm run db:test` | Áp migration lên Postgres tạm trong Docker và chạy test RLS |
| `npm run db:types` | Sinh lại kiểu TypeScript từ database |
| `npm run payos:webhook` | Đăng ký webhook PayOS cho kênh của nền tảng |
| `npm run brand:generate` | Sinh lại toàn bộ ảnh logo và icon |

Ứng dụng mobile: `cd mobile && npm install && npm start`.

## Triển khai

- **Vercel** (khuyên dùng): nối repo GitHub, điền biến môi trường, mỗi lần push `master` tự deploy.
- **Docker trên VPS**: có sẵn [web/Dockerfile](web/Dockerfile) (Next.js standalone).

Từng bước, kể cả cài PayOS và webhook, xem [DEPLOYMENT.md](DEPLOYMENT.md). Nhớ chạy `supabase db push` **trước** khi deploy code dùng bảng mới.

## Bảo mật

- Mọi bảng đều bật RLS. Người dùng không có quyền ghi trực tiếp vào bảng nghiệp vụ, mọi thao tác ghi đi qua Server Action có kiểm tra quyền.
- Webhook PayOS luôn kiểm tra chữ ký theo đúng kênh của đơn, kiểm tra số tiền và xử lý lặp an toàn.
- Hàm thống kê và gửi thông báo hàng loạt chỉ `service_role` gọi được.
- Bộ test SQL trong [supabase/tests](supabase/tests) chạy trong CI cho mỗi lần push.

Phát hiện lỗ hổng thì báo riêng cho chủ dự án, đừng mở issue công khai.

## Đóng góp

1. Tạo nhánh từ `master`, ví dụ `feature/ten-tinh-nang`.
2. Chạy `npm run check` (và `npm run db:test` nếu đổi database) trước khi push.
3. Đổi database thì thêm file migration mới trong `supabase/migrations`, không sửa migration cũ.
4. Quy chuẩn giao diện xem [DESIGN.md](DESIGN.md).
