-- ==============================================================================
-- Migration: 20261024000000_profiles_column_privacy.sql
-- Description: Không để bảng profiles bị đọc tự do bằng anon key (có trong bundle phía client).
--
-- Trước đây policy SELECT là USING (true) và anon/authenticated được đọc MỌI cột,
-- nên ai cũng lấy được số điện thoại, role... của toàn bộ người dùng qua REST API.
--
-- Cách xử lý: RLS vẫn cho đọc dòng (giao diện cần hiện tên/avatar người tạo kèo, người đánh giá),
-- nhưng quyền đọc được giới hạn theo CỘT:
--   anon          : chỉ thông tin hiển thị công khai (id, tên, avatar, trình độ, điểm)
--   authenticated : thêm role + mốc thời gian; KHÔNG có phone_number
--   phone_number  : chủ sân đọc qua get_booking_contacts() (chỉ khách đã đặt sân của mình);
--                   server dùng service_role nên không bị ảnh hưởng.
-- Hệ quả: SELECT * FROM profiles / select=* qua REST sẽ báo permission denied với anon và authenticated,
--         nên mọi truy vấn phải liệt kê cột tường minh.
-- ==============================================================================

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (id, full_name, avatar_url, skill_level, rating)
  ON public.profiles TO anon;

GRANT SELECT (id, full_name, avatar_url, skill_level, rating, role, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Chủ sân xem tên + số điện thoại của khách đã đặt sân thuộc cụm sân của mình.
-- SECURITY DEFINER để đọc được phone_number; quyền được kiểm tra ngay trong WHERE.
CREATE OR REPLACE FUNCTION public.get_booking_contacts(p_booking_ids UUID[])
RETURNS TABLE (booking_id UUID, full_name TEXT, phone_number TEXT) AS $$
  SELECT b.id, p.full_name, p.phone_number
  FROM public.bookings b
  JOIN public.courts ct ON ct.id = b.court_id
  JOIN public.clubs c ON c.id = ct.club_id
  JOIN public.profiles p ON p.id = b.user_id
  WHERE b.id = ANY (p_booking_ids)
    AND c.owner_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_booking_contacts(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_contacts(UUID[]) TO authenticated, service_role;
