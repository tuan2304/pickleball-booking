-- ==============================================================================
-- Migration: 20261026000000_drop_payout_reconciliation.sql
-- Description: Gỡ phần đối soát thu hộ cọc đã bỏ khỏi ứng dụng (commit 92b3cf9).
--
-- Quản trị không còn thu hộ hay chi trả tiền cọc, nên:
--   * platform_stats() không còn trả 'owed_total' (không màn hình nào đọc)
--   * hàm club_balances() không còn ai gọi -> xóa
--
-- KHÔNG xóa bảng public.payouts: trên production nó còn 1 dòng sổ cũ, và
-- lib/deletion-guards.ts vẫn dùng nó để không cho xóa cụm sân có lịch sử chi trả.
-- Nếu sau này muốn bỏ hẳn, hãy sao lưu dòng đó rồi viết migration riêng.
-- ==============================================================================

-- 1. platform_stats: cùng nội dung migration 20261023000000, chỉ bỏ khóa 'owed_total'.
--    Phải sửa hàm này trước khi xóa club_balances vì nó đang gọi hàm đó.
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

-- 2. Không còn nơi nào gọi
DROP FUNCTION IF EXISTS public.club_balances(UUID[]);
