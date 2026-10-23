# 🏟️ SportArena — Luồng hoạt động của hệ thống

> Nền tảng **đặt sân + ghép kèo thể thao** theo thời gian thực.
> Tài liệu này giải thích *người dùng đi qua những bước nào* và *hệ thống xử lý gì phía sau*.
>
> 💡 **Xem sơ đồ:** mở file này rồi nhấn `Ctrl+Shift+V` trong VS Code (cần extension
> *Markdown Preview Mermaid Support*), hoặc xem trực tiếp trên GitHub – sơ đồ tự hiển thị.

---

## 1. Tổng quan trong 30 giây

| Vai trò | Làm được gì |
| :-- | :-- |
| 🏃 **Người chơi** | Tìm sân → chọn giờ → cọc bằng QR → mở/tham gia kèo → chat → đánh giá sân |
| 🏢 **Chủ sân** | Tạo cụm sân & sân con → đặt bảng giá theo khung giờ → xem lịch đặt realtime → nhận thông báo khi có cọc |
| 🤖 **Hệ thống** | Chống trùng lịch, giữ chỗ 15 phút, sinh QR, nhận webhook thanh toán, bắn thông báo realtime |

Có **3 con số** cần nhớ:

- ⏱️ **15 phút** – thời gian giữ chỗ chờ cọc
- 💰 **% cọc** – chủ sân tự đặt cho từng sân (mặc định 30%)
- 🔒 **0 lần trùng lịch** – do Postgres chặn ở tầng database, không phải ở code

---

## 2. Kiến trúc

```mermaid
flowchart LR
    subgraph Client["Người dùng"]
        W["🌐 Web<br/>Next.js 16 + Tailwind"]
        M["📱 Mobile<br/>Expo / React Native"]
    end

    subgraph Server["Next.js (Vercel)"]
        SA["Server Actions<br/>booking · matches · chat · reviews"]
        WH["/api/payos/webhook"]
    end

    subgraph Supa["Supabase"]
        AUTH["Auth"]
        DB[("PostgreSQL<br/>+ RLS")]
        RT["Realtime"]
    end

    PAYOS["💳 PayOS<br/>(VietQR)"]

    W -->|gọi| SA
    W <-.->|"lắng nghe thay đổi"| RT
    M --> DB
    M <-.-> RT
    SA --> DB
    SA --> PAYOS
    PAYOS -->|"báo đã chuyển khoản"| WH
    WH --> DB
    DB --> RT
    W --> AUTH
```

**Điểm hay của thiết kế:** web không tự "hỏi lại" server liên tục. Khi database đổi (có cọc, có người xin vào kèo, có tin nhắn mới), **Supabase Realtime đẩy** thay đổi xuống trình duyệt → giao diện tự cập nhật.

---

## 3. Luồng chính: Đặt sân → Cọc → Xác nhận

Đây là luồng quan trọng nhất của sản phẩm.

```mermaid
sequenceDiagram
    autonumber
    actor P as Người chơi
    participant UI as Trang chi tiết sân
    participant SA as Server Action<br/>createBooking
    participant DB as PostgreSQL
    participant PO as PayOS
    participant WH as Webhook
    participant RT as Realtime
    actor O as Chủ sân

    P->>UI: Chọn sân con, ngày, các ô giờ trống
    UI-->>P: Hiện tổng tiền + tiền cọc (tính trực tiếp)
    P->>UI: Bấm "Giữ chỗ"
    UI->>SA: createBooking(court, start, end)

    SA->>DB: Lấy giá cơ bản + bảng giá theo khung giờ
    SA->>SA: Tính tổng tiền, tiền cọc (% do chủ sân đặt)
    SA->>DB: INSERT booking (status = pending, hết hạn sau 15')

    alt Trùng giờ với người khác
        DB-->>SA: ❌ Lỗi 23P01 (Exclusion Constraint)
        SA-->>UI: "Khung giờ vừa có người đặt"
    else Giờ còn trống
        DB-->>SA: ✅ Tạo thành công
        SA->>PO: Tạo link thanh toán + mã QR
        PO-->>SA: qrCode, checkoutUrl
        SA->>DB: INSERT payment (pending)
        SA-->>UI: Chuyển sang /bookings/[id]
    end

    UI-->>P: Hiện QR + đồng hồ đếm ngược 15:00
    P->>PO: Quét QR, chuyển khoản
    PO->>WH: POST webhook (đã nhận tiền)
    WH->>DB: payment → paid · booking → confirmed
    WH->>DB: INSERT notifications (cho người chơi & chủ sân)
    DB->>RT: Phát sự kiện thay đổi
    RT-->>UI: ✅ Trang tự chuyển "Đặt sân thành công"
    RT-->>O: 🔔 Chuông báo "Có đơn đặt sân mới"
```

### Vòng đời của một đơn đặt sân

```mermaid
stateDiagram-v2
    [*] --> pending: Người chơi giữ chỗ
    pending --> confirmed: Nhận đủ tiền cọc
    pending --> cancelled: Hết 15 phút chưa cọc
    confirmed --> completed: Chủ sân đánh dấu đã chơi xong
    confirmed --> cancelled: Chủ sân / người chơi hủy
    completed --> [*]
    cancelled --> [*]

    note right of pending
        Giờ này đã bị KHÓA,
        người khác không đặt được
    end note
    note right of cancelled
        Giờ được nhả ra,
        ai cũng đặt lại được
    end note
```

### Vì sao không bao giờ trùng lịch?

Không kiểm tra bằng code (dễ bị 2 người bấm cùng lúc). Database có ràng buộc:

```sql
EXCLUDE USING gist (court_id WITH =, during WITH &&)
WHERE (status IN ('pending', 'confirmed'))
```

> Nghĩa là: **cùng một sân + khoảng giờ giao nhau + đơn còn hiệu lực = bị Postgres từ chối.**
> Ai bấm trước thì được, người sau nhận thông báo lỗi thân thiện.

### Cách tính giá

```mermaid
flowchart TD
    A["Giờ bắt đầu + thứ trong tuần"] --> B{"Có bảng giá<br/>khớp khung giờ & thứ?"}
    B -- Có --> C["Dùng giá của khung đó<br/>(giờ vàng, cuối tuần...)"]
    B -- Không --> D["Dùng giá cơ bản của sân"]
    C --> E["Tổng tiền = số giờ × đơn giá"]
    D --> E
    E --> F["Tiền cọc = Tổng × % cọc của sân"]
    F --> G["Còn lại: trả trực tiếp tại sân"]
```

---

## 4. Luồng Ghép kèo (Matchmaking)

Người chơi đã có sân nhưng thiếu người → mở **kèo** để mọi người cùng tham gia.

```mermaid
flowchart TD
    S1["Đặt sân mới<br/>(bật công tắc 'Mở ghép kèo')"] --> M
    S2["Đơn có sẵn trong<br/>'Lịch đặt của tôi' → Mở kèo"] --> M
    M["Tạo kèo: tên, trình độ, số người cần,<br/>cách chia tiền"] --> C{"Chia tiền thế nào?"}
    C -- "Chia đều" --> C1["Chi phí/người = Tổng tiền sân ÷ số người"]
    C -- "Chủ bao trọn" --> C2["Chi phí/người = 0 đ"]
    C1 --> L
    C2 --> L
    L["Kèo hiện ở trang /matches<br/>(trạng thái: open)"]

    L --> J["Người khác bấm 'Xin tham gia'"]
    J --> N1["🔔 Chủ kèo nhận thông báo"]
    N1 --> D{"Chủ kèo duyệt?"}
    D -- Duyệt --> A["accepted<br/>số người +1"]
    D -- Từ chối --> R["rejected<br/>🔔 báo người xin"]
    A --> F{"Đủ người chưa?"}
    F -- Đủ --> FULL["Kèo chuyển 'full'"]
    F -- Chưa --> L
    A --> CH["💬 Vào phòng chat của kèo"]
```

### Trạng thái người tham gia

```mermaid
stateDiagram-v2
    [*] --> pending: Gửi yêu cầu
    pending --> accepted: Chủ kèo duyệt
    pending --> rejected: Chủ kèo từ chối
    accepted --> left: Tự rời kèo
    left --> pending: Xin tham gia lại
    rejected --> [*]
```

---

## 5. Realtime: ai nghe cái gì?

| Màn hình | Bảng được lắng nghe | Kết quả người dùng thấy |
| :-- | :-- | :-- |
| `/bookings/[id]` | `bookings` | Đang chờ cọc → tự chuyển "Thành công" |
| `/owner/schedule` | `bookings` | Lịch của chủ sân thêm đơn mới ngay lập tức |
| `/matches/[id]` | `match_participants`, `matches` | Danh sách thành viên & số chỗ trống tự đổi |
| Hộp chat trong kèo | `match_messages` | Tin nhắn mới hiện ngay, không cần F5 |
| Phần đánh giá sân | `club_reviews` | Review mới hiện ngay |
| 🔔 Chuông thông báo | `notifications` | Số đỏ tăng + popup |

---

## 6. Bản đồ trang (Web)

```mermaid
flowchart LR
    HOME["/ Trang chủ"] --> CLUBS["/clubs<br/>Khám phá sân"]
    HOME --> MATCHES["/matches<br/>Kèo giao lưu"]
    HOME --> LOGIN["/login · /register"]

    CLUBS --> CD["/clubs/[id]<br/>Chi tiết + chọn giờ + đánh giá"]
    CD --> BK["/bookings/[id]<br/>QR + đếm ngược 15'"]
    BK --> MB["/my-bookings<br/>Sân đã đặt · Kèo tham gia"]
    MB -.->|"Mở kèo"| MATCHES
    MATCHES --> MD["/matches/[id]<br/>Chi tiết + duyệt + chat"]

    LOGIN -->|"role = owner"| OD["/owner/dashboard"]
    OD --> OC["/owner/clubs<br/>Quản lý cụm & sân con"]
    OD --> OP["/owner/pricing<br/>Bảng giá theo khung giờ"]
    OD --> OS["/owner/schedule<br/>Lịch đặt (lưới + bảng)"]
```

---

## 7. Cơ sở dữ liệu

```mermaid
erDiagram
    PROFILES ||--o{ CLUBS : "sở hữu (owner)"
    CLUBS ||--o{ COURTS : "có nhiều sân con"
    COURTS ||--o{ COURT_PRICING_RULES : "bảng giá khung giờ"
    COURTS ||--o{ BOOKINGS : "được đặt"
    PROFILES ||--o{ BOOKINGS : "đặt"
    BOOKINGS ||--o| MATCHES : "mở thành kèo (1-1)"
    BOOKINGS ||--o{ PAYMENTS : "thanh toán cọc"
    MATCHES ||--o{ MATCH_PARTICIPANTS : "người tham gia"
    MATCHES ||--o{ MATCH_MESSAGES : "chat"
    CLUBS ||--o{ CLUB_REVIEWS : "được đánh giá"
    PROFILES ||--o{ NOTIFICATIONS : "nhận"

    PROFILES {
        uuid id PK
        text role "player / owner / admin"
        text skill_level
    }
    COURTS {
        uuid id PK
        text sport_type
        numeric base_price_per_hour
        int deposit_percentage "% cọc"
    }
    BOOKINGS {
        uuid id PK
        timestamptz start_time
        timestamptz end_time
        text status "pending / confirmed / completed / cancelled"
        timestamptz expires_at "+15 phút"
    }
    MATCHES {
        uuid id PK
        int required_players
        int current_players
        text cost_sharing_type "split / host_covers"
    }
    PAYMENTS {
        uuid id PK
        bigint order_code "mã đơn PayOS"
        text status "pending / paid / ..."
    }
```

**8 bảng lõi** (`profiles`, `clubs`, `courts`, `court_pricing_rules`, `bookings`, `matches`, `match_participants`, `payments`) + **3 bảng mở rộng** (`notifications`, `match_messages`, `club_reviews`). Toàn bộ bật **Row Level Security**.

---

## 8. Lộ trình đã đi qua

```mermaid
timeline
    title 9 giai đoạn đã hoàn thành
    section Nền tảng
        GĐ 1 : Khởi tạo Next.js, Supabase, schema 8 bảng
        GĐ 2 : Cổng chủ sân – CLB, sân con, bảng giá, lịch
    section Người chơi
        GĐ 3 : Khám phá sân, chọn giờ, giữ chỗ 15 phút
        GĐ 4 : Ghép kèo, duyệt thành viên, chia tiền
    section Thanh toán & Dữ liệu
        GĐ 5 : PayOS webhook, chuông thông báo realtime
        GĐ 6 : Seed dữ liệu mẫu
    section Mở rộng
        GĐ 7 : Ứng dụng mobile Expo
        GĐ 8 : Docker, hướng dẫn deploy Vercel
        GĐ 9 : Live chat trong kèo, đánh giá sân
```

---

## 9. Tài khoản dùng thử (dữ liệu seed)

| Vai trò | Email | Mật khẩu |
| :-- | :-- | :-- |
| Chủ sân | `owner@sportarena.vn` | `123456` |
| Người chơi 1 | `player1@sportarena.vn` | `123456` |
| Người chơi 2 | `player2@sportarena.vn` | `123456` |

> ⚠️ Chỉ dùng cho môi trường thử nghiệm. Đổi/xóa các tài khoản này trước khi mở cho người dùng thật.

---

*Xem thêm: [GEMINI.md](GEMINI.md) – nhật ký chi tiết · [DEPLOYMENT.md](DEPLOYMENT.md) – hướng dẫn triển khai*
