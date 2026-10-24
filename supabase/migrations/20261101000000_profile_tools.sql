-- ==============================================================================
-- Migration: 20261101000000_profile_tools.sql
-- Description: Hồ sơ người chơi.
--
-- 1. get_my_profile(): người dùng đọc lại hồ sơ đầy đủ của CHÍNH MÌNH, kể cả số điện thoại. Cột phone_number
--    đã bị khóa quyền đọc trực tiếp (migration 20261024) nên cần hàm này để form chỉnh sửa hồ sơ hiện số hiện có.
-- 2. player_public_stats(): số liệu công khai cho trang hồ sơ người chơi (chỉ các con số, không lộ đơn của ai).
--    SECURITY DEFINER vì RLS không cho người lạ đọc đơn đặt sân của người khác.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (id UUID, full_name TEXT, phone_number TEXT, avatar_url TEXT, role TEXT, skill_level TEXT, rating NUMERIC) AS $$
  SELECT p.id, p.full_name, p.phone_number, p.avatar_url, p.role, p.skill_level, p.rating
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.player_public_stats(p_user UUID)
RETURNS TABLE (matches_created INTEGER, matches_joined INTEGER, bookings_played INTEGER) AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.matches m WHERE m.creator_id = p_user),
    (SELECT COUNT(*)::INTEGER FROM public.match_participants mp WHERE mp.user_id = p_user AND mp.status = 'accepted'),
    (SELECT COUNT(*)::INTEGER FROM public.bookings b
       WHERE b.user_id = p_user AND (b.status = 'completed' OR (b.status = 'confirmed' AND b.end_time < NOW())));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.player_public_stats(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.player_public_stats(UUID) TO anon, authenticated, service_role;
