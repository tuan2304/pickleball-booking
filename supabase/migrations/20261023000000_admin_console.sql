-- ==============================================================================
-- Migration: 20261023000000_admin_console.sql
-- Trang quản trị nền tảng: thống kê vận hành, hỗ trợ (ticket) giữa người dùng và quản trị,
-- gửi thông báo cập nhật cho người dùng.
-- ==============================================================================

-- ==============================================================================
-- 1. HÀM KIỂM TRA QUẢN TRỊ (dùng trong RLS để admin nhận được dữ liệu realtime)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(p_user UUID)
RETURNS BOOLEAN AS $$
  SELECT p_user IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND role = 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. PHIẾU HỖ TRỢ (TICKET) + TIN NHẮN
--    open: chờ quản trị trả lời · answered: quản trị đã trả lời, chờ người dùng · resolved · closed
--    Mọi thay đổi đi qua server (service_role); người dùng chỉ được ĐỌC phiếu của chính mình.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 120),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('payment', 'booking', 'technical', 'account', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, last_message_at DESC);

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  sender_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.support_tickets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ticket_messages FROM anon, authenticated;

DROP POLICY IF EXISTS "Users read own tickets, admins read all" ON public.support_tickets;
CREATE POLICY "Users read own tickets, admins read all"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read messages of own tickets, admins read all" ON public.ticket_messages;
CREATE POLICY "Users read messages of own tickets, admins read all"
  ON public.ticket_messages FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid())
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;

-- ==============================================================================
-- 3. THÔNG BÁO CẬP NHẬT TRANG WEB (quản trị gửi tới tất cả / chủ sân / người chơi)
--    Mỗi người nhận một dòng trong bảng notifications (chuông thông báo có sẵn).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 1000),
  kind TEXT NOT NULL DEFAULT 'update' CHECK (kind IN ('update', 'maintenance', 'promo')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'owners', 'players')),
  link TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.announcements FROM anon, authenticated;

-- Gửi một thông báo: tạo thông báo cho từng người nhận và ghi số người đã gửi. Chỉ gửi được một lần.
CREATE OR REPLACE FUNCTION public.broadcast_announcement(p_id UUID)
RETURNS INTEGER AS $$
DECLARE
  a public.announcements%ROWTYPE;
  n INTEGER;
BEGIN
  -- Khóa dòng để hai lần gửi đồng thời không tạo thông báo trùng
  SELECT * INTO a FROM public.announcements WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ANNOUNCEMENT_NOT_FOUND';
  END IF;
  IF a.sent_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_SENT';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT p.id, a.title, a.body, 'system', a.link
  FROM public.profiles p
  WHERE a.audience = 'all'
     OR (a.audience = 'owners' AND p.role IN ('owner', 'admin'))
     OR (a.audience = 'players' AND p.role = 'player');
  GET DIAGNOSTICS n = ROW_COUNT;

  UPDATE public.announcements SET sent_count = n, sent_at = NOW() WHERE id = p_id;
  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.broadcast_announcement(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_announcement(UUID) TO service_role;

-- ==============================================================================
-- 4. THỐNG KÊ VẬN HÀNH NỀN TẢNG
--    Một lần gọi trả về toàn bộ số liệu cho khoảng [p_from, p_to). Ngày tính theo giờ Việt Nam.
--    - GMV: tổng giá trị sân của đơn đã xác nhận/hoàn thành (tính theo ngày tạo đơn)
--    - Cọc đã thu: khoản cọc thật đã thanh toán (bỏ giả lập), tính theo ngày thanh toán
--    - Doanh thu nền tảng: tiền thuê bao đã thanh toán (tiền cọc KHÔNG phải doanh thu của nền tảng)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_stats(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB AS $$
  WITH
  real_payments AS (
    SELECT p.amount, p.metadata, COALESCE(p.paid_at, p.created_at) AS paid_time
    FROM public.payments p
    WHERE p.status = 'paid'
      AND COALESCE((p.metadata->>'simulated')::boolean, FALSE) = FALSE
  ),
  pay AS (SELECT * FROM real_payments WHERE paid_time >= p_from AND paid_time < p_to),
  bk AS (SELECT * FROM public.bookings WHERE created_at >= p_from AND created_at < p_to),
  sub AS (
    SELECT amount FROM public.subscription_payments
    WHERE status = 'paid' AND COALESCE(paid_at, created_at) >= p_from AND COALESCE(paid_at, created_at) < p_to
  ),
  days AS (
    SELECT d::date AS day
    FROM generate_series(
      date_trunc('day', p_from AT TIME ZONE 'Asia/Ho_Chi_Minh'),
      date_trunc('day', (p_to - INTERVAL '1 second') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
      INTERVAL '1 day'
    ) AS d
  ),
  daily AS (
    SELECT
      days.day,
      (SELECT COUNT(*) FROM bk WHERE (bk.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = days.day) AS bookings,
      COALESCE((SELECT SUM(pay.amount) FROM pay WHERE (pay.paid_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = days.day), 0) AS deposits,
      (SELECT COUNT(*) FROM public.profiles pr
        WHERE pr.created_at >= p_from AND pr.created_at < p_to
          AND (pr.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = days.day) AS new_users
    FROM days
  ),
  top AS (
    SELECT
      c.id,
      c.name,
      COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS bookings,
      COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS gmv
    FROM bk b
    JOIN public.courts ct ON ct.id = b.court_id
    JOIN public.clubs c ON c.id = ct.club_id
    GROUP BY c.id, c.name
    HAVING COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed')) > 0
    ORDER BY 3 DESC, 4 DESC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM public.profiles),
      'players', (SELECT COUNT(*) FROM public.profiles WHERE role = 'player'),
      'owners', (SELECT COUNT(*) FROM public.profiles WHERE role = 'owner'),
      'new', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= p_from AND created_at < p_to)
    ),
    'clubs', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM public.clubs),
      'new', (SELECT COUNT(*) FROM public.clubs WHERE created_at >= p_from AND created_at < p_to),
      'pro', (SELECT COUNT(*) FROM public.clubs WHERE plan = 'pro' AND plan_until > NOW()),
      'own_payos', (SELECT COUNT(*) FROM public.clubs WHERE accepts_online_payment)
    ),
    'courts_active', (SELECT COUNT(*) FROM public.courts WHERE is_active),
    'bookings', jsonb_build_object(
      'created', (SELECT COUNT(*) FROM bk),
      'confirmed', (SELECT COUNT(*) FROM bk WHERE status IN ('confirmed', 'completed')),
      'pending', (SELECT COUNT(*) FROM bk WHERE status = 'pending'),
      'cancelled', (SELECT COUNT(*) FROM bk WHERE status = 'cancelled'),
      'gmv', (SELECT COALESCE(SUM(total_price), 0) FROM bk WHERE status IN ('confirmed', 'completed'))
    ),
    'deposits', jsonb_build_object(
      'collected', (SELECT COALESCE(SUM(amount), 0) FROM pay),
      'platform_channel', (SELECT COALESCE(SUM(amount), 0) FROM pay WHERE COALESCE(metadata->>'channel', 'platform') = 'platform'),
      'club_channel', (SELECT COALESCE(SUM(amount), 0) FROM pay WHERE metadata->>'channel' = 'club'),
      'needs_refund', (SELECT COALESCE(SUM(amount), 0) FROM pay WHERE COALESCE((metadata->>'needs_refund')::boolean, FALSE))
    ),
    'subscriptions', jsonb_build_object(
      'revenue', (SELECT COALESCE(SUM(amount), 0) FROM sub),
      'count', (SELECT COUNT(*) FROM sub)
    ),
    'matches', jsonb_build_object(
      'created', (SELECT COUNT(*) FROM public.matches WHERE created_at >= p_from AND created_at < p_to),
      'open', (SELECT COUNT(*) FROM public.matches WHERE status = 'open')
    ),
    'owed_total', (SELECT COALESCE(SUM(owed), 0) FROM public.club_balances()),
    'open_tickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open'),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'bookings', bookings, 'deposits', deposits, 'new_users', new_users) ORDER BY day)
      FROM daily
    ), '[]'::jsonb),
    'top_clubs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'bookings', bookings, 'gmv', gmv) ORDER BY bookings DESC, gmv DESC)
      FROM top
    ), '[]'::jsonb)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.platform_stats(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
