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
