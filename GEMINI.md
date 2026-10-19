# Dự án: Nền tảng Đặt sân & Ghép kèo Thể thao Real-time

## 📌 Nguyên tắc làm việc (Mandates)
1. **Ghi chép (Logging):** Mọi hành động, thay đổi kiến trúc, và tiến độ phải được ghi lại vào file `GEMINI.md` này.
2. **Kiểm tra (Context First):** Phải đọc file này trước khi bắt đầu bất kỳ tác vụ nào để đảm bảo tính nhất quán.
3. **Xác nhận Logic (Logic First):** Luôn hỏi ý kiến người dùng về các logic nghiệp vụ trước khi tiến hành code.
4. **Phong cách (Vibe):** Ưu tiên giao diện đẹp (Modern, Sporty), code sạch, và trải nghiệm người dùng mượt mà (Real-time).

## 🏗️ Kiến trúc tổng thể (Architecture)
- **Web:** Next.js (App Router), Tailwind CSS.
- **Mobile:** React Native (Expo) - *Giai đoạn sau*.
- **Backend/Database:** Supabase (Postgres, Auth, Realtime, Storage).
- **Thanh toán:** Tích hợp VietQR (PayOS).

## 🗺️ Lộ trình (Roadmap)
- [x] **Giai đoạn 1: Khởi tạo Web & Cấu trúc dự án** (Hoàn thành)
- [x] **Giai đoạn 2: Quản lý Sân (Dành cho Chủ sân)** (Hoàn thành)
- [x] **Giai đoạn 3: Tìm kiếm & Đặt sân (Dành cho Người chơi)** (Hoàn thành)
- [x] **Giai đoạn 4: Hệ thống Ghép kèo (Matchmaking)** (Hoàn thành)
- [x] **Giai đoạn 5: Thanh toán PayOS Webhook & Real-time Notification** (Hoàn thành)
- [x] **Giai đoạn 6: Seed Data Mẫu & Kiểm Thử E2E** (Hoàn thành)
- [x] **Giai đoạn 7: Phát triển Mobile App (React Native / Expo)** (Hoàn thành)
- [x] **Giai đoạn 8: Triển khai Production (Deploy Web)** (Hoàn thành)
- [x] **Giai đoạn 9: Nâng cấp Live Chat & Đánh giá/Review** (Hoàn thành)

## 📝 Nhật ký hoạt động (Activity Log)
- **2024-05-20:** Khởi tạo file `GEMINI.md` và thiết lập quy trình làm việc.
- **Quyết định Logic:** 
    - Cấu trúc: Monorepo (web/, mobile/, supabase/).
    - Auth: Dùng chung hệ thống (Role-based: Admin/Owner/Player).
    - UI: Next.js + Tailwind CSS + Shadcn/ui.
- **Hành động:** 
    - Đã tạo các thư mục gốc `web`, `mobile`, `supabase`.
    - Khởi tạo dự án Next.js 14+ (App Router) trong thư mục `web`.
    - Khởi tạo Shadcn/ui thành công.
- **Quyết định Logic Database:**
    - Cấu trúc: Cụm sân (Club) -> Sân con (Courts). Lịch đặt theo từng sân con.
    - Thời gian: **Chọn giờ tự do (Flexible Time)**. Chống trùng lịch bằng `tstzrange` và ràng buộc loại trừ `EXCLUDE USING gist` trong Postgres.
    - Cơ chế giá: **Linh hoạt theo khung giờ** (Giờ thường, Giờ cao điểm / Cuối tuần).
    - Giữ chỗ tạm thời: **15 phút** chờ quét mã VietQR PayOS trước khi tự động hủy.
    - Mức đặt cọc: **Chủ sân tự cấu hình % cọc** cho từng sân (gợi ý 30% - 50%).
    - Ghép kèo: Tích hợp vào lúc đặt sân; chủ kèo tùy chọn **Chia đều tiền sân** hoặc **Bao trọn sân**.
    - Thanh toán: Tự động tạo mã VietQR (PayOS) và xác thực cọc qua Webhook Realtime.
- **2026-09-21:** 
    - Rà soát và đồng bộ hiện trạng dự án.
    - Đã đệ trình và được người dùng phê duyệt 4 quyết định logic nghiệp vụ cốt lõi (Giá linh hoạt theo khung giờ, Timeout giữ chỗ 15 phút, Chủ sân tự cấu hình % cọc, Tùy chọn chia tiền ghép kèo).
- **2026-09-24:**
    - Khởi tạo cấu hình Supabase (`supabase init`).
    - Hoàn tất viết file migration SQL Schema [20260924000000_initial_schema.sql](file:///D:/myproject/supabase/migrations/20260924000000_initial_schema.sql) gồm đầy đủ 8 bảng nghiệp vụ (`profiles`, `clubs`, `courts`, `court_pricing_rules`, `bookings`, `matches`, `match_participants`, `payments`).
    - Cấu hình ràng buộc loại trừ `EXCLUDE USING gist` chống trùng lịch tự động và cờ hết hạn cọc sau 15 phút.
    - Cấu hình phân quyền bảo mật cấp dòng (Row Level Security - RLS) và đăng ký Realtime publication.
    - Cài đặt thành công `@supabase/supabase-js`, `@supabase/ssr` cho ứng dụng `web`.
    - Tạo đầy đủ Database TypeScript types tại [web/src/types/database.ts](file:///D:/myproject/web/src/types/database.ts).
    - Tạo các module client/server/middleware helper cho Supabase tại [web/src/lib/supabase/](file:///D:/myproject/web/src/lib/supabase/) và [web/src/middleware.ts](file:///D:/myproject/web/src/middleware.ts).
    - Đăng nhập Supabase CLI và liên kết thành công với dự án Cloud: `MyProject` (`hlaawnushcfuzidzwvww`).
    - Thực hiện đẩy trực tiếp toàn bộ 8 bảng và logic chống trùng lịch lên Supabase Cloud qua `supabase db push`.
    - Khởi tạo file cấu hình môi trường [web/.env.local](file:///D:/myproject/web/.env.local) liên kết trực tiếp với dự án.
    - Hoàn tất **Giai đoạn 1**!
- **2026-10-02:**
    - Hoàn tất xây dựng toàn bộ **Giai đoạn 2 (Quản lý Sân cho Chủ sân)**:
      1. Triển khai các trang Xác thực: Trang Đăng nhập [web/src/app/(auth)/login/page.tsx](file:///D:/myproject/web/src/app/(auth)/login/page.tsx), Trang Đăng ký [web/src/app/(auth)/register/page.tsx](file:///D:/myproject/web/src/app/(auth)/register/page.tsx) với thẻ lựa chọn vai trò trực quan (Chủ sân vs Người chơi).
      2. Xây dựng Server Actions xác thực [web/src/app/actions/auth.ts](file:///D:/myproject/web/src/app/actions/auth.ts) và tự động điều hướng theo Role (`owner` -> `/owner/dashboard`).
      3. Xây dựng Layout Dashboard Chủ sân với Sidebar chuyên nghiệp [web/src/components/owner/owner-sidebar.tsx](file:///D:/myproject/web/
      
      
      src/components/owner/owner-sidebar.tsx) và Header bảo vệ theo session.
      4. Xây dựng trang Tổng quan [web/src/app/owner/dashboard/page.tsx](file:///D:/myproject/web/src/app/owner/dashboard/page.tsx) hiển thị các thẻ KPIs (Cụm sân, Sân con, Lịch đặt trong ngày, Doanh thu cọc) và đơn đặt mới nhất.
      5. Xây dựng trang Quản lý Cụm Sân & Sân Con [web/src/app/owner/clubs/page.tsx](file:///D:/myproject/web/src/app/owner/clubs/page.tsx) hỗ trợ thêm cụm sân, thêm sân con, tạm ngưng/bật lại sân (`is_active`) và xóa cụm/sân.
      6. Xây dựng trang Lịch Đặt Sân [web/src/app/owner/schedule/page.tsx](file:///D:/myproject/web/src/app/owner/schedule/page.tsx) kết hợp cả 2 chế độ: **Lưới thời gian (Timeline Grid)** và **Bảng dữ liệu (Data Table)**, tích hợp **Supabase Realtime Live Channel** tự động cập nhật khi có khách đặt mới.
      7. Xây dựng trang Cấu hình Bảng Giá Linh Hoạt [web/src/app/owner/pricing/page.tsx](file:///D:/myproject/web/src/app/owner/pricing/page.tsx) thiết lập giờ cao điểm/cuối tuần cho từng sân con kèm chức năng xóa khung giá.
      8. Cập nhật trang chủ Landing Page thể thao [web/src/app/page.tsx](file:///D:/myproject/web/src/app/page.tsx) kết nối trực tiếp đến Auth và Owner Portal.
      9. Kiểm tra TypeScript và chạy Production Build thành công 100%.
    - Hoàn tất **Giai đoạn 2**!
- **Khởi động Giai đoạn 3 (Tìm kiếm & Đặt sân cho Người chơi):**
    - Đã đệ trình và được người dùng phê duyệt 3 quyết định logic UI/UX:
      1. **Khám phá sân:** Giao diện Lưới thẻ thể thao hiện đại kèm Thanh lọc nhanh theo Bộ môn (Bóng đá, Cầu lông, Pickleball...) và Khu vực (Quận/Huyện).
      2. **Chọn giờ đặt sân:** Lưới khung giờ trực quan (Time Slot Picker: click chọn slot trống, tự động chuyển màu khi kín lịch, hỗ trợ chọn nối tiếp nhiều slot).
      3. **Giữ chỗ & Cọc:** Trang giữ chỗ trực tiếp (`/bookings/[id]`) có Đồng hồ đếm ngược 15 phút, sinh mã VietQR động chuẩn PayOS và kênh Real-time tự động cập nhật khi khách chuyển khoản thành công.
- **2026-10-10:**
    - Hoàn tất xây dựng toàn bộ **Giai đoạn 3 (Tìm kiếm & Đặt sân cho Người chơi)**:
      1. Xây dựng Server Actions đặt sân [web/src/app/actions/booking.ts](file:///D:/myproject/web/src/app/actions/booking.ts) hỗ trợ tính giá linh hoạt theo giờ vàng/cuối tuần, tính % cọc, chống trùng lịch tự động và khởi tạo giao dịch VietQR PayOS.
      2. Xây dựng MainHeader dùng chung [web/src/components/layout/main-header.tsx](file:///D:/myproject/web/src/components/layout/main-header.tsx) kết nối các trang Người chơi & Cổng Chủ sân.
      3. Xây dựng trang Khám Phá Sân [web/src/app/clubs/page.tsx](file:///D:/myproject/web/src/app/clubs/page.tsx) tích hợp bộ lọc nhanh theo bộ môn thể thao và khu vực quận huyện [web/src/components/clubs/club-filters.tsx](file:///D:/myproject/web/src/components/clubs/club-filters.tsx).
      4. Xây dựng trang Chi Tiết Cụm Sân [web/src/app/clubs/[id]/page.tsx](file:///D:/myproject/web/src/app/clubs/[id]/page.tsx).
      5. Xây dựng bộ chọn giờ trực quan [web/src/components/booking/time-slot-picker.tsx](file:///D:/myproject/web/src/components/booking/time-slot-picker.tsx) hiển thị các slot trống, tính toán chi phí và mức cọc theo thời gian thực.
      6. Xây dựng trang Giữ Chỗ & Thanh Toán VietQR [web/src/app/bookings/[id]/page.tsx](file:///D:/myproject/web/src/app/bookings/[id]/page.tsx) kết hợp đồng hồ đếm ngược 15 phút, mã VietQR động chuẩn PayOS và kênh Supabase Realtime Live tự động xá
      
      c nhận khi có cọc [web/src/components/booking/booking-payment-view.tsx](file:///D:/myproject/web/src/components/booking/booking-payment-view.tsx).
      7. Xây dựng trang Lịch Đặt Của Tôi [web/src/app/my-bookings/page.tsx](file:///D:/myproject/web/src/app/my-bookings/page.tsx) theo dõi trạng thái các đơn đặt.
      8. Chạy Production Build thành công 100% với 12 route tối ưu hóa.
    - Hoàn tất **Giai đoạn 3**!
- **Khởi động Giai đoạn 4 (Hệ thống Ghép kèo - Matchmaking):**
    - Đã đệ trình và được người dùng phê duyệt 3 quyết định logic nghiệp vụ:
      1. **Duyệt thành viên:** Chủ kèo duyệt yêu cầu (pending -> accepted/rejected) để đảm bảo phù hợp trình độ và văn hóa đội.
      2. **Luồng tạo kèo:** Hỗ trợ 2 luồng: Mở ghép kèo ngay khi Đặt sân (Time Slot Picker) HOẶC mở ghép kèo từ các đơn đặt có sẵn trong "Lịch đặt của tôi".
      3. **Phân chia chi phí:** Tự động tính toán chi phí gợi ý (Tổng tiền sân / Số người) nếu chọn Chia đều, và 0đ nếu chọn Chủ bao trọn.
- **2026-10-10 (Tiếp tục):**
    - Hoàn tất xây dựng toàn bộ **Giai đoạn 4 (Hệ thống Ghép kèo - Matchmaking)**:
      1. Xây dựng Server Actions ghép kèo [web/src/app/actions/matches.ts](file:///D:/myproject/web/src/app/actions/matches.ts) (`createMatch`, `joinMatch`, `respondParticipant`, `leaveMatch`, `cancelMatch`).
      2. Nâng cấp Server Action [web/src/app/actions/booking.ts](file:///D:/myproject/web/src/app/actions/booking.ts) hỗ trợ `matchConfig` tạo bài đăng ghép kèo ngay lúc giữ chỗ sân.
      3. Tích hợp tùy chọn "Mở Ghép Kèo Giao Lưu" trực quan vào bộ chọn giờ [web/src/components/booking/time-slot-picker.tsx](file:///D:/myproject/web/src/components/booking/time-slot-picker.tsx).
      4. Xây dựng thanh điều hướng và cập nhật MainHeader [web/src/components/layout/main-header.tsx](file:///D:/myproject/web/src/components/layout/main-header.tsx) bổ sung nút "Kèo Giao Lưu" (`/matches`).
      5. Xây dựng trang Khám Phá Kèo Thể Thao [web/src/app/matches/page.tsx](file:///D:/myproject/web/src/app/matches/page.tsx) kèm bộ lọc theo Môn, Trình độ, Hình thức chia tiền [web/src/components/matches/match-filters.tsx](file:///D:/myproject/web/src/components/matches/match-filters.tsx) và thẻ hiển thị kèo [web/src/components/matches/match-card.tsx](file:///D:/myproject/web/src/components/matches/match-card.tsx).
      6. Xây dựng trang Chi Tiết Kèo & Tham Gia [web/src/app/matches/[id]/page.tsx](file:///D:/myproject/web/src/app/matches/[id]/page.tsx) kết hợp component [web/src/components/matches/match-detail-view.tsx](file:///D:/myproject/web/src/components/matches/match-detail-view.tsx) với kênh Supabase Realtime tự động cập nhật khi có ứng viên mới hoặc chủ kèo duyệt.
      7. Xây dựng Modal mở ghép kèo cho đơn đặt có sẵn [web/src/components/matches/create-match-modal.tsx](file:///D:/myproject/web/src/components/matches/create-match-modal.tsx).
      8. Nâng cấp trang Lịch Đặt Của Tôi [web/src/app/my-bookings/page.tsx](file:///D:/myproject/web/src/app/my-bookings/page.tsx) và component [web/src/components/booking/my-bookings-view.tsx](file:///D:/myproject/web/src/components/booking/my-bookings-view.tsx) hỗ trợ 2 tab ("Sân Tôi Đã Đặt" & "Kèo Tôi Tham Gia") cùng nút mở ghép kèo tiện lợi.
      9. Cập nhật trang chủ Landing Page [web/src/app/page.tsx](file:///D:/myproject/web/src/app/page.tsx) kết nối trực tiếp đến Kèo Giao Lưu.
      10. Chạy Production Build thành công 100% với 13 route tối ưu hóa.
    - Hoàn tất **Giai đoạn 4**!
- **Tiếp theo:** Bước sang **Giai đoạn 5: Thanh toán PayOS Webhook & Real-time Notification** (Tích hợp API PayOS chính thức, tạo Payment Link/VietQR qua API, Webhook endpoint nhận IPN tự động xác nhận chuyển khoản và thông báo chuông).
- **2026-10-12:**
    - Rà soát toàn bộ codebase, xác nhận phần lớn Giai đoạn 5 đã được xây dựng sẵn từ các giai đoạn trước.
    - Hoàn tất xây dựng toàn bộ **Giai đoạn 5 (Thanh toán PayOS Webhook & Real-time Notification)**:
      1. Xác nhận [web/src/lib/payos.ts](file:///D:/myproject/web/src/lib/payos.ts) đã tích hợp PayOS SDK + VietQR fallback đầy đủ.
      2. Xác nhận [web/src/app/api/payos/webhook/route.ts](file:///D:/myproject/web/src/app/api/payos/webhook/route.ts) nhận IPN, xác minh chữ ký PayOS, cập nhật `payments` & `bookings` và gửi thông báo real-time.
      3. Xác nhận [web/src/app/actions/notifications.ts](file:///D:/myproject/web/src/app/actions/notifications.ts) có đủ CRUD (`getNotifications`, `markAsRead`, `markAllAsRead`, `createNotification`).
      4. Xác nhận [web/src/components/notifications/notification-bell.tsx](file:///D:/myproject/web/src/components/notifications/notification-bell.tsx) có Bell icon + Dropdown + Supabase Realtime subscription tự động nhận thông báo mới.
      5. Tạo migration SQL [supabase/migrations/20261012000000_add_notifications.sql](file:///D:/myproject/supabase/migrations/20261012000000_add_notifications.sql) cho bảng `notifications` với RLS đầy đủ (user chỉ xem/sửa thông báo của mình).
      6. Đăng ký bảng `notifications` vào `supabase_realtime` publication để Supabase tự broadcast mỗi khi có thông báo mới INSERT.
      7. Push migration thành công lên Supabase Cloud (`hlaawnushcfuzidzwvww`).
      8. Sửa lỗi TypeScript `Cannot use namespace 'PayOS' as a type` trong `lib/payos.ts` sau khi nâng Next.js lên 16.4.0 (đổi sang `require()` cho CommonJS module).
      9. Nâng cấp Next.js từ 16.3.x lên **16.4.0** (vá lỗ hổng bảo mật Critical: RCE, Cache Poisoning, SSRF).
      10. Chạy Production Build thành công 100% với **14 route** tối ưu hóa.
    - Hoàn tất **Giai đoạn 5**! 🎉
- **Ghi chú kỹ thuật:**
    - Luồng thanh toán hoàn chỉnh: `TimeSlotPicker` → `createBooking()` → PayOS API → QR Code → Người chơi quét → PayOS gọi Webhook → `api/payos/webhook` cập nhật DB → Supabase Realtime broadcast → `NotificationBell` hiện popup + `BookingPaymentView` tự chuyển trạng thái.
    - Để kích hoạt PayOS thật: điền `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` vào `.env.local` và cấu hình Webhook URL trên dashboard PayOS: `https://yourdomain.com/api/payos/webhook`.
- **2026-10-19:**
    - Tinh chỉnh giao diện trang chủ [web/src/app/page.tsx](file:///D:/myproject/web/src/app/page.tsx): Loại bỏ nút "Cổng Chủ Sân" ở Hero Section đầu trang nhằm tối ưu trải nghiệm tập trung cho Người chơi khám phá sân và ghép kèo thể thao.
    - Hoàn tất **Giai đoạn 6: Seed Data Mẫu & Kiểm Thử E2E**:
      1. Viết script nạp dữ liệu mẫu [web/scripts/seed.mjs](file:///D:/myproject/web/scripts/seed.mjs).
      2. Tạo thành công 3 tài khoản Auth mẫu: Chủ sân (`owner@sportarena.vn`), 2 Người chơi (`player1@sportarena.vn`, `player2@sportarena.vn`) với mật khẩu chung `123456`.
      3. Tạo 3 Cụm sân thực tế: D-Sports Arena Thảo Điền (Pickleball & Tennis), Hangar Arena Cầu Giấy (Cầu Lông & Bóng Đá Mini), Saigon Sports Center Phú Mỹ Hưng (Pickleball & Bóng Rổ).
      4. Tạo các Sân con, quy tắc Giờ vàng tối và cuối tuần.
      5. Tạo đơn đặt sân và Kèo giao lưu mẫu kèm thành viên tham gia đã được duyệt.
      6. Tạo hệ thống thông báo chuông Real-time mẫu cho cả Chủ sân và Người chơi.
    - Hoàn tất **Giai đoạn 7: Phát triển Mobile App (React Native / Expo)**:
      1. Khởi tạo dự án Expo SDK 58 (TypeScript) tại thư mục [mobile/](file:///D:/myproject/mobile/).
      2. Cài đặt các thư viện lõi: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`, `react-native-svg`, `lucide-react-native`.
      3. Cấu hình Supabase Client kết nối đồng bộ cơ sở dữ liệu với Web [mobile/src/lib/supabase.ts](file:///D:/myproject/mobile/src/lib/supabase.ts).
      4. Thiết lập bảng màu giao diện thể thao hiện đại [mobile/src/theme/colors.ts](file:///D:/myproject/mobile/src/theme/colors.ts) và TypeScript types [mobile/src/types/index.ts](file:///D:/myproject/mobile/src/types/index.ts).
      5. Xây dựng 5 màn hình Tab Bar:
         - [mobile/src/screens/ClubsScreen.tsx](file:///D:/myproject/mobile/src/screens/ClubsScreen.tsx): Khám phá cụm sân & bộ lọc theo bộ môn (Pickleball, Cầu lông, Bóng đá...).
         - [mobile/src/screens/MatchesScreen.tsx](file:///D:/myproject/mobile/src/screens/MatchesScreen.tsx): Danh sách kèo giao lưu đang mở tuyển người.
         - [mobile/src/screens/MyBookingsScreen.tsx](file:///D:/myproject/mobile/src/screens/MyBookingsScreen.tsx): Quản lý lịch sân đã đặt và cọc.
         - [mobile/src/screens/NotificationsScreen.tsx](file:///D:/myproject/mobile/src/screens/NotificationsScreen.tsx): Hệ thống thông báo chuông tức thời.
         - [mobile/src/screens/ProfileScreen.tsx](file:///D:/myproject/mobile/src/screens/ProfileScreen.tsx): Tài khoản cá nhân kèm Quick Switcher giữa 3 tài khoản mẫu.
      6. Xây dựng 2 màn hình Stack chi tiết: [mobile/src/screens/ClubDetailScreen.tsx](file:///D:/myproject/mobile/src/screens/ClubDetailScreen.tsx) và [mobile/src/screens/MatchDetailScreen.tsx](file:///D:/myproject/mobile/src/screens/MatchDetailScreen.tsx).
      7. Điều hướng RootNavigator hoàn chỉnh tại [mobile/src/navigation/RootNavigator.tsx](file:///D:/myproject/mobile/src/navigation/RootNavigator.tsx) và [mobile/App.tsx](file:///D:/myproject/mobile/App.tsx).
      8. Kiểm tra TypeScript (`npx tsc --noEmit`) thành công 100% không có bất kỳ cảnh báo lỗi nào.
    - Hoàn tất **Giai đoạn 8: Triển khai Production (Deploy Web)**:
      1. Tối ưu hóa cấu hình [web/next.config.ts](file:///D:/myproject/web/next.config.ts) hỗ trợ `output: 'standalone'` và cấu hình remote image patterns.
      2. Soạn thảo file cấu hình biến môi trường mẫu [web/.env.example](file:///D:/myproject/web/.env.example).
      3. Xây dựng [web/Dockerfile](file:///D:/myproject/web/Dockerfile) multi-stage tối ưu dung lượng cho trường hợp chạy trên VPS/Server riêng.
      4. Soạn thảo tài liệu hướng dẫn triển khai hoàn chỉnh [DEPLOYMENT.md](file:///D:/myproject/DEPLOYMENT.md) chi tiết các bước đưa Web lên Vercel thông qua GitHub repository `tuan2304/pickleball-booking` và cấu hình Webhook PayOS.
      5. Kiểm tra build standalone production thành công.
    - Sẵn sàng bước sang **Giai đoạn 9: Nâng cấp Live Chat & Đánh giá/Review**.
- **2026-10-19 (Giai đoạn 9):**
    - Hoàn tất xây dựng toàn bộ **Giai đoạn 9 (Live Chat & Đánh giá/Review)**:
      1. Tạo migration SQL [supabase/migrations/20261019000000_add_chat_and_reviews.sql](file:///D:/myproject/supabase/migrations/20261019000000_add_chat_and_reviews.sql) bổ sung 2 bảng mới: `match_messages` (Live Chat theo kèo) và `club_reviews` (Đánh giá sao + nhận xét cụm sân), đầy đủ RLS và Supabase Realtime publication.
      2. Push migration thành công lên Supabase Cloud (`hlaawnushcfuzidzwvww`).
      3. Bổ sung TypeScript types vào [web/src/types/database.ts](file:///D:/myproject/web/src/types/database.ts): định nghĩa table `match_messages` & `club_reviews` trong `Database['public']['Tables']`, thêm `MiniProfile`, `MatchMessage`, `ClubReview` interfaces.
      4. Xây dựng Server Actions chat [web/src/app/actions/chat.ts](file:///D:/myproject/web/src/app/actions/chat.ts): `getMatchMessages()`, `sendMatchMessage()`.
      5. Xây dựng Server Actions review [web/src/app/actions/reviews.ts](file:///D:/myproject/web/src/app/actions/reviews.ts): `getClubReviews()`, `submitClubReview()`.
      6. Xây dựng component Live Chat [web/src/components/matches/match-chat-box.tsx](file:///D:/myproject/web/src/components/matches/match-chat-box.tsx) với Supabase Realtime subscription, hiển thị bubble chat theo chiều trái (người khác) / phải (tôi), auto-scroll, hỗ trợ Enter để gửi.
      7. Xây dựng component Đánh giá Sân [web/src/components/clubs/club-reviews-section.tsx](file:///D:/myproject/web/src/components/clubs/club-reviews-section.tsx) gồm Form chọn sao tương tác + nhập nhận xét + danh sách review realtime.
      8. Tích hợp `MatchChatBox` vào trang Chi Tiết Kèo [web/src/app/matches/[id]/page.tsx](file:///D:/myproject/web/src/app/matches/[id]/page.tsx) và [web/src/components/matches/match-detail-view.tsx](file:///D:/myproject/web/src/components/matches/match-detail-view.tsx).
      9. Tích hợp `ClubReviewsSection` vào trang Chi Tiết Cụm Sân [web/src/app/clubs/[id]/page.tsx](file:///D:/myproject/web/src/app/clubs/[id]/page.tsx).
      10. Fix TypeScript: dùng `MiniProfile` type thay vì full `Profile` để match với Supabase partial select query.
      11. Chạy Production Build thành công 100% với **15 route** tối ưu hóa (exit code 0).
    - **Toàn bộ 9 Giai đoạn đã hoàn thành! 🎉🏆**




