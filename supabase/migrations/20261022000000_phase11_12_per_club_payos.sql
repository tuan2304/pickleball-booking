-- ==============================================================================
-- Migration: 20261022000000_phase11_12_per_club_payos.sql
-- Giai đoạn 11: mỗi cụm sân dùng kênh PayOS riêng (tiền cọc về thẳng chủ sân)
--               + sổ đối soát khi nền tảng thu hộ (giai đoạn chạy thử)
-- Giai đoạn 12: thuê bao theo cụm sân (gói free / pro)
-- ==============================================================================

-- ==============================================================================
-- 1. KHÓA PAYOS CỦA TỪNG CỤM SÂN (mã hóa ở tầng ứng dụng, chỉ server đọc được)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.club_payment_settings (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  payos_client_id TEXT NOT NULL,
  payos_api_key_enc TEXT NOT NULL,
  payos_checksum_key_enc TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.club_payment_settings ENABLE ROW LEVEL SECURITY;
-- Không có policy nào và thu hồi toàn bộ quyền: chỉ service_role (server) truy cập được
REVOKE ALL ON public.club_payment_settings FROM anon, authenticated;

DROP TRIGGER IF EXISTS update_club_payment_settings_updated_at ON public.club_payment_settings;
CREATE TRIGGER update_club_payment_settings_updated_at
BEFORE UPDATE ON public.club_payment_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 2. CỘT MỚI TRÊN CLUBS + KHÓA QUYỀN GHI THEO CỘT
--    Chủ sân không được tự đặt gói, hạn gói, hay cờ "đã kết nối thanh toán".
-- ==============================================================================
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS accepts_online_payment BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS plan_until TIMESTAMPTZ;

ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_plan_check;
ALTER TABLE public.clubs ADD CONSTRAINT clubs_plan_check CHECK (plan IN ('free', 'pro'));

REVOKE INSERT, UPDATE ON public.clubs FROM anon, authenticated;
GRANT INSERT (owner_id, name, description, address, ward, district, city, latitude, longitude,
              open_time, close_time, amenities, images, is_active)
  ON public.clubs TO authenticated;
GRANT UPDATE (name, description, address, ward, district, city, latitude, longitude,
              open_time, close_time, amenities, images, is_active)
  ON public.clubs TO authenticated;

-- ==============================================================================
-- 3. THANH TOÁN THUÊ BAO (chủ sân trả cho nền tảng qua kênh PayOS của nền tảng)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_code BIGINT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  months INTEGER NOT NULL CHECK (months BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')),
  checkout_url TEXT,
  qr_code_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_club ON public.subscription_payments(club_id);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_payments FROM anon, authenticated;

DROP POLICY IF EXISTS "Owners can view own subscription payments" ON public.subscription_payments;
CREATE POLICY "Owners can view own subscription payments"
  ON public.subscription_payments FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = subscription_payments.club_id AND c.owner_id = auth.uid())
  );

-- Áp một khoản thuê bao đã thanh toán: nguyên tử và an toàn khi webhook bị gọi lặp.
-- Trả về dòng (club_id, user_id, plan_until) nếu vừa áp, không trả gì nếu đã áp trước đó.
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(p_payment_id UUID, p_reference TEXT DEFAULT NULL)
RETURNS TABLE (club_id UUID, user_id UUID, plan_until TIMESTAMPTZ) AS $$
DECLARE
  sp RECORD;
BEGIN
  UPDATE public.subscription_payments s
  SET status = 'paid',
      paid_at = NOW(),
      metadata = s.metadata || jsonb_build_object('reference', p_reference)
  WHERE s.id = p_payment_id AND s.status IN ('pending', 'cancelled')
  RETURNING s.club_id, s.user_id, s.months INTO sp;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.clubs c
  SET plan = 'pro',
      plan_until = GREATEST(COALESCE(c.plan_until, NOW()), NOW()) + (sp.months * INTERVAL '30 days')
  WHERE c.id = sp.club_id
  RETURNING c.id, sp.user_id, c.plan_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.apply_subscription_payment(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_payment(UUID, TEXT) TO service_role;

-- ==============================================================================
-- 4. SỔ ĐỐI SOÁT KHI NỀN TẢNG THU HỘ (kênh PayOS của nền tảng)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_club ON public.payouts(club_id);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.payouts FROM anon, authenticated;

DROP POLICY IF EXISTS "Owners can view payouts of own clubs" ON public.payouts;
CREATE POLICY "Owners can view payouts of own clubs"
  ON public.payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = payouts.club_id AND c.owner_id = auth.uid()));

-- Số tiền nền tảng đã thu hộ / đã chi / còn nợ chủ sân, theo từng cụm sân.
-- Chỉ tính khoản cọc thật đã thanh toán qua kênh của nền tảng; bỏ qua khoản giả lập
-- và khoản "đã nhận nhưng mất sân" (cần hoàn cho khách, không phải của chủ sân).
CREATE OR REPLACE FUNCTION public.club_balances(p_club_ids UUID[] DEFAULT NULL)
RETURNS TABLE (club_id UUID, club_name TEXT, collected NUMERIC, paid_out NUMERIC, owed NUMERIC) AS $$
  WITH base AS (
    SELECT
      c.id AS club_id,
      c.name AS club_name,
      COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p
        JOIN public.bookings b ON b.id = p.booking_id
        JOIN public.courts ct ON ct.id = b.court_id
        WHERE ct.club_id = c.id
          AND p.status = 'paid'
          AND COALESCE(p.metadata->>'channel', 'platform') = 'platform'
          AND COALESCE((p.metadata->>'simulated')::boolean, FALSE) = FALSE
          AND COALESCE((p.metadata->>'needs_refund')::boolean, FALSE) = FALSE
      ), 0) AS collected,
      COALESCE((SELECT SUM(po.amount) FROM public.payouts po WHERE po.club_id = c.id), 0) AS paid_out
    FROM public.clubs c
    WHERE p_club_ids IS NULL OR c.id = ANY (p_club_ids)
  )
  SELECT base.club_id, base.club_name, base.collected, base.paid_out, base.collected - base.paid_out AS owed
  FROM base;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.club_balances(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_balances(UUID[]) TO service_role;
