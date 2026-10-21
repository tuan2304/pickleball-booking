-- ==============================================================================
-- Migration: 20261021000000_phase10_hardening.sql
-- Description: Giai đoạn 10 - Hardening (bảo mật RLS, độ tin cậy thanh toán, hết hạn giữ chỗ)
--
-- Nguyên tắc: người dùng (anon/authenticated) KHÔNG được ghi trực tiếp vào các bảng
-- nghiệp vụ nhạy cảm (bookings, payments, matches, notifications). Mọi thay đổi đi qua
-- Server Actions dùng service_role sau khi đã kiểm tra quyền ở phía server.
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES: không cho tự nâng quyền
-- ==============================================================================

-- Chỉ chấp nhận player/owner khi đăng ký. 'admin' chỉ được cấp thủ công trong DB.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    CASE WHEN requested_role IN ('player', 'owner') THEN requested_role ELSE 'player' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Chỉ cho sửa các cột hồ sơ cá nhân; role, rating... chỉ service_role mới đổi được
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone_number, avatar_url, skill_level) ON public.profiles TO authenticated;

-- ==============================================================================
-- 2. KHÓA QUYỀN GHI TRỰC TIẾP VÀO BẢNG NGHIỆP VỤ
-- ==============================================================================
REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.matches FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.match_participants FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;

-- Thông báo: người dùng chỉ được đánh dấu đã đọc
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
DROP POLICY IF EXISTS "Authenticated users or server can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Yêu cầu tham gia kèo (mobile vẫn insert trực tiếp): chỉ được tạo yêu cầu 'pending'
-- cho chính mình, vào kèo đang mở và không phải kèo của mình
DROP POLICY IF EXISTS "Authenticated users can request to join matches" ON public.match_participants;
CREATE POLICY "Authenticated users can request to join matches"
  ON public.match_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.status = 'open' AND m.creator_id <> auth.uid()
    )
  );

-- Bỏ các policy UPDATE không còn dùng (đã thu hồi quyền UPDATE ở trên)
DROP POLICY IF EXISTS "Participants or match creator can update participant status" ON public.match_participants;
DROP POLICY IF EXISTS "Match creators can update their matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update own bookings or club owners manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Booking owners can create matches" ON public.matches;

-- ==============================================================================
-- 3. TỰ ĐỘNG ĐẾM NGƯỜI TRONG KÈO (thay cho đọc-rồi-ghi ở code app)
-- ==============================================================================

-- 3a. Chặn duyệt quá số người cần (khóa dòng match để tránh 2 lần duyệt đồng thời)
CREATE OR REPLACE FUNCTION public.guard_match_capacity()
RETURNS TRIGGER AS $$
DECLARE
  m RECORD;
  accepted_others INTEGER;
BEGIN
  IF NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
    SELECT id, required_players, status INTO m
    FROM public.matches WHERE id = NEW.match_id FOR UPDATE;

    IF m.status NOT IN ('open', 'full') THEN
      RAISE EXCEPTION 'MATCH_CLOSED' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO accepted_others
    FROM public.match_participants
    WHERE match_id = NEW.match_id AND status = 'accepted' AND id <> NEW.id;

    -- required_players đã gồm cả chủ kèo
    IF 1 + accepted_others >= m.required_players THEN
      RAISE EXCEPTION 'MATCH_FULL' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_match_capacity ON public.match_participants;
CREATE TRIGGER trg_guard_match_capacity
BEFORE INSERT OR UPDATE ON public.match_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_match_capacity();

-- 3b. Tự tính lại current_players + status mỗi khi danh sách thành viên đổi
CREATE OR REPLACE FUNCTION public.sync_match_players()
RETURNS TRIGGER AS $$
DECLARE
  target UUID := COALESCE(NEW.match_id, OLD.match_id);
  accepted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO accepted_count
  FROM public.match_participants WHERE match_id = target AND status = 'accepted';

  UPDATE public.matches
  SET current_players = 1 + accepted_count,
      status = CASE
        WHEN status IN ('open', 'full') THEN
          CASE WHEN 1 + accepted_count >= required_players THEN 'full' ELSE 'open' END
        ELSE status
      END
  WHERE id = target;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_match_players ON public.match_participants;
CREATE TRIGGER trg_sync_match_players
AFTER INSERT OR UPDATE OR DELETE ON public.match_participants
FOR EACH ROW EXECUTE FUNCTION public.sync_match_players();

-- 3c. Đồng bộ lại dữ liệu cũ (seed/chỉnh tay có thể đang lệch)
UPDATE public.matches m
SET current_players = 1 + (
      SELECT COUNT(*) FROM public.match_participants p
      WHERE p.match_id = m.id AND p.status = 'accepted'
    ),
    status = CASE
      WHEN m.status IN ('open', 'full') THEN
        CASE WHEN 1 + (
          SELECT COUNT(*) FROM public.match_participants p
          WHERE p.match_id = m.id AND p.status = 'accepted'
        ) >= m.required_players THEN 'full' ELSE 'open' END
      ELSE m.status
    END;

-- ==============================================================================
-- 4. MÃ ĐƠN PAYOS KHÔNG TRÙNG + HẾT HẠN GIỮ CHỖ PHÍA DATABASE
-- ==============================================================================

-- 4a. Sequence cấp orderCode (bắt đầu cao để không đụng mã cũ dạng ngẫu nhiên)
CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq START 10000000;

CREATE OR REPLACE FUNCTION public.next_payos_order_code()
RETURNS BIGINT AS $$
  SELECT nextval('public.payos_order_code_seq');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 4b. Hủy các đơn pending đã quá hạn, nhả sân, báo người dùng. Trả về số đơn đã hủy.
CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    WITH expired AS (
      UPDATE public.bookings b
      SET status = 'cancelled'
      WHERE b.status = 'pending' AND b.expires_at <= NOW()
      RETURNING b.id, b.user_id
    )
    SELECT id, user_id FROM expired
  LOOP
    expired_count := expired_count + 1;

    UPDATE public.payments SET status = 'cancelled'
    WHERE booking_id = rec.id AND status = 'pending';

    UPDATE public.matches SET status = 'cancelled'
    WHERE booking_id = rec.id AND status IN ('open', 'full');

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      rec.user_id,
      'Hết hạn giữ chỗ 15 phút ⏰',
      'Đơn giữ chỗ của bạn đã quá hạn do chưa nhận được tiền cọc. Sân đã được giải phóng.',
      'booking',
      '/clubs'
    );
  END LOOP;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Hai hàm này chỉ server (service_role) và cron được gọi
REVOKE EXECUTE ON FUNCTION public.next_payos_order_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_payos_order_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_pending_bookings() TO service_role;

-- 4c. Lập lịch chạy mỗi phút bằng pg_cron. Nếu project chưa bật pg_cron thì chỉ cảnh báo
--     (ứng dụng vẫn tự dọn đơn quá hạn mỗi lần có người đặt sân).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'expire-pending-bookings',
    '* * * * *',
    'SELECT public.expire_pending_bookings()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Bỏ qua lập lịch pg_cron (hãy bật extension pg_cron trong Dashboard): %', SQLERRM;
END $$;

-- ==============================================================================
-- 5. LỊCH BẬN CỦA SÂN (công khai nhưng không lộ thông tin người đặt)
--    Trước đây người chơi chỉ thấy đơn của chính mình nên lưới giờ hiển thị sai.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_busy_slots(p_court_ids UUID[])
RETURNS TABLE (court_id UUID, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, status TEXT) AS $$
  SELECT b.court_id, b.start_time, b.end_time, b.status
  FROM public.bookings b
  WHERE b.court_id = ANY (p_court_ids)
    AND b.end_time > NOW()
    AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > NOW()));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_busy_slots(UUID[]) TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. CHAT: chỉ chủ kèo và thành viên đã được duyệt
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_match_member(p_match UUID, p_user UUID)
RETURNS BOOLEAN AS $$
  SELECT p_user IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = p_match AND m.creator_id = p_user)
    OR EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = p_match AND mp.user_id = p_user AND mp.status = 'accepted'
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_match_member(UUID, UUID) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Match messages are viewable by everyone" ON public.match_messages;
CREATE POLICY "Match members can read messages"
  ON public.match_messages FOR SELECT
  USING (public.is_match_member(match_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert match messages" ON public.match_messages;
CREATE POLICY "Match members can send messages"
  ON public.match_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_match_member(match_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.status <> 'cancelled')
  );

-- Giới hạn độ dài (chỉ áp cho dòng mới, không quét dữ liệu cũ)
ALTER TABLE public.match_messages DROP CONSTRAINT IF EXISTS match_messages_content_length;
ALTER TABLE public.match_messages
  ADD CONSTRAINT match_messages_content_length
  CHECK (char_length(content) BETWEEN 1 AND 1000) NOT VALID;

-- ==============================================================================
-- 7. ĐÁNH GIÁ: chỉ người đã chơi tại cụm sân, không phải chủ sân
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.can_review_club(p_club UUID, p_user UUID)
RETURNS BOOLEAN AS $$
  SELECT p_user IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = p_club AND c.owner_id = p_user)
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.courts ct ON ct.id = b.court_id
      WHERE ct.club_id = p_club
        AND b.user_id = p_user
        AND (b.status = 'completed' OR (b.status = 'confirmed' AND b.end_time < NOW()))
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.can_review_club(UUID, UUID) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can insert club reviews" ON public.club_reviews;
CREATE POLICY "Players who played can insert club reviews"
  ON public.club_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_review_club(club_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update their own club reviews" ON public.club_reviews;
CREATE POLICY "Users can update their own club reviews"
  ON public.club_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.can_review_club(club_id, auth.uid()));

ALTER TABLE public.club_reviews DROP CONSTRAINT IF EXISTS club_reviews_comment_length;
ALTER TABLE public.club_reviews
  ADD CONSTRAINT club_reviews_comment_length
  CHECK (comment IS NULL OR char_length(comment) <= 1000) NOT VALID;

-- ==============================================================================
-- 8. RÀNG BUỘC DỮ LIỆU BỔ SUNG
-- ==============================================================================
-- Tiền cọc không được vượt tổng tiền
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS check_deposit_not_over_total;
ALTER TABLE public.bookings
  ADD CONSTRAINT check_deposit_not_over_total CHECK (deposit_amount <= total_price) NOT VALID;
