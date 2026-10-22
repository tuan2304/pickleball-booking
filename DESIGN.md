# 🎨 SportArena — Quy tắc thiết kế

Tài liệu ngắn để mọi màn hình mới giữ cùng một phong cách. Các kiểm tra tương phản/chạm/chuyển động dựa trên bộ hướng dẫn
[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (đã đọc và đối chiếu, không sao chép nguyên văn).

## Tinh thần
Năng động, rõ ràng, "thể thao" nhưng dễ đọc. Xanh lá = sân còn trống / hành động chính; vàng = ghép kèo / chú ý;
đỏ **chỉ** dành cho nguy hiểm (hủy, xóa, lỗi).

> Skill gợi ý tông đỏ cho lĩnh vực thể thao. Dự án giữ **emerald** vì đỏ trùng với màu của thao tác nguy hiểm
> và xanh lá gợi đúng ý nghĩa "còn trống".

## Chữ
| Vai trò | Font | Ghi chú |
| :-- | :-- | :-- |
| Thân bài, nút, form | **Be Vietnam Pro** | Thiết kế cho tiếng Việt nên dấu không bị lệch |
| Tiêu đề h1/h2, logo, số lớn | **Barlow Condensed** | Gọn, đậm, đúng chất thể thao |

- Cỡ chữ tối thiểu **12px** (`text-xs`). Không dùng `text-[10px]`/`text-[11px]`.
- Tiêu đề dùng `font-extrabold`; thân bài `font-medium`/`font-semibold` cho nhãn.

## Logo

Chữ **S** dựng từ vòng tròn giữa sân (hai cung bán kính 12 trên lưới 96 × 96), vạch giữa sân đi qua điểm nối, **quả bóng vàng** ở đầu chữ S là điểm hẹn / ghim vị trí. Chữ **SPORT** màu mực, **ARENA** màu xanh sân, font Barlow Condensed 800 in hoa.

| Cần dùng | Cách dùng |
| :-- | :-- |
| Trong giao diện web | `<Logo size={36} />` (bản ngang), `<LogoMark />` (chỉ biểu tượng), `<Wordmark />` (chỉ chữ) từ `components/brand/logo.tsx`. Không vẽ logo bằng tay ở nơi khác |
| Biến thể biểu tượng | `badge` (mặc định), `white` (trên nền xanh), `bare-dark` / `bare-light` (không khung, trên ảnh hoặc nền trơn) |
| File ảnh | `web/public/brand/*.svg`; favicon, `apple-icon.png`, icon app mobile đều sinh từ một nguồn |
| Đổi logo | Sửa hình học ở `web/scripts/generate-brand-assets.mjs` và `components/brand/logo.tsx`, rồi chạy `npm run brand:generate` trong `web/` |

Quy tắc: vùng an toàn xung quanh = ¼ chiều cao biểu tượng; biểu tượng nhỏ nhất 16 px (từ 32 px trở xuống dùng bản nhỏ, nền phẳng, không vạch sân mờ); bản ngang rộng tối thiểu 120 px. Không kéo giãn, không đổi màu, không thêm bóng đổ, không đặt khung xanh lên nền cùng tông xanh (dùng biến thể `white`).

## Màu và tương phản (WCAG AA: chữ thường ≥ 4,5 : 1)
| Cách dùng | Màu | Tương phản |
| :-- | :-- | :-- |
| Nút chính (chữ trắng) | `bg-emerald-700` · hover `emerald-800` | 5,48 : 1 ✅ |
| Chữ nhấn thương hiệu trên nền sáng | `text-emerald-700 dark:text-emerald-400` | 5,48 : 1 ✅ |
| Nút kèo giao lưu (chữ **tối**) | `bg-amber-400 text-slate-900` | > 9 : 1 ✅ |
| Chữ vàng trên nền sáng | `text-amber-700 dark:text-amber-400` | 5,02 : 1 ✅ |
| Chữ phụ | `text-muted-foreground` | 4,74 : 1 ✅ |

Không dùng: chữ trắng trên `emerald-600` (3,77), chữ trắng trên `amber-500` (2,15), `text-amber-600` trên nền trắng (3,19).

## Icon
Chỉ dùng SVG (`lucide-react`). **Không dùng emoji làm icon.** Môn thể thao dùng `<SportIcon sport="…" />`.
Icon trang trí thêm `aria-hidden`; nút chỉ có icon bắt buộc có `aria-label`.

## Chuyển động
- Vào trang 250 ms, thẻ xuất hiện so le tối đa 350 ms, hover thẻ 350 ms.
- Chỉ animate `opacity` và `transform` (không animate width/height).
- Luôn có `prefers-reduced-motion` (đã xử lý trong `globals.css`).
- Đang tải dữ liệu: dùng skeleton (`.skeleton`) và `aria-busy`, không để màn hình trống.

## Tương tác
- Vùng chạm tối thiểu: nút mặc định `h-8` trên chuột, tự lên `h-10` trên màn hình cảm ứng (`pointer-coarse:`).
- Khoảng cách giữa các nút kề nhau ≥ 8px (`gap-2`).
- Thông báo lỗi có `role="alert"`; nút bật/tắt dùng `aria-pressed`.
- Mọi phần tử bấm được có `cursor-pointer` và trạng thái focus nhìn thấy được.

## Định dạng hiển thị
Tiền, ngày, giờ **luôn** đi qua `lib/format.ts` (ép múi giờ Việt Nam). Nhãn môn/trình độ lấy từ `lib/constants.ts`.
Không gọi trực tiếp `toLocaleString`/`toLocaleTimeString` trong component.

## Giao diện sáng / tối

- Nút chuyển ở thanh đầu trang ([theme-toggle.tsx](web/src/components/theme/theme-toggle.tsx)). Chưa tự chọn thì theo cài đặt của hệ điều hành; đã chọn thì nhớ trong `localStorage` (khóa `sa-theme`).
- Script nhỏ trong `<head>` ([lib/theme.ts](web/src/lib/theme.ts)) đặt class `dark` trước khi vẽ trang nên không bị nháy sáng.
- Màu dùng biến ngữ nghĩa (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`). Bảng màu tối ở `.dark` trong `globals.css`, cùng tông emerald (hue 165) thay vì xám trung tính.
- Chữ màu đậm trên nền sáng phải có cặp tối: `text-red-600 dark:text-red-400`, `text-emerald-700 dark:text-emerald-400`, `text-amber-700 dark:text-amber-400`. Quy tắc: tương phản chữ thường ≥ 4.5:1 ở cả hai chế độ.
- Nút vàng (`bg-amber-400 text-slate-900`) và nút xanh (`bg-emerald-700 text-white`) giữ nguyên ở cả hai chế độ. Mã QR luôn đặt trên nền trắng để quét được.
