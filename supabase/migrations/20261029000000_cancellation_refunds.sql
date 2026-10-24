-- ==============================================================================
-- Migration: 20261029000000_cancellation_refunds.sql
-- Description: Chính sách hủy sân và theo dõi hoàn cọc.
--
-- Chính sách do từng cụm sân đặt: hủy trước free_cancel_hours giờ so với giờ chơi thì được hoàn cọc,
-- hủy muộn hơn thì mất cọc; chủ sân hủy thì luôn hoàn đủ. Tiền cọc về thẳng tài khoản của chủ sân
-- (kênh PayOS riêng hoặc chuyển khoản), nên việc hoàn tiền do chủ sân chuyển trả và bấm "Đã hoàn cọc".
-- Các cột của bookings chỉ server (service_role) ghi được, người dùng không có quyền UPDATE bảng này.
-- ==============================================================================

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS free_cancel_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_free_cancel_hours_check;
ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_free_cancel_hours_check CHECK (free_cancel_hours BETWEEN 0 AND 168);

-- Chủ sân tự đặt chính sách của cụm sân mình (RLS "Owners can update own clubs" vẫn áp dụng)
GRANT UPDATE (free_cancel_hours) ON public.clubs TO authenticated;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancelled_by_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancelled_by_check CHECK (cancelled_by IS NULL OR cancelled_by IN ('player', 'owner', 'system'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_refund_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_refund_status_check CHECK (refund_status IN ('none', 'pending', 'refunded'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_refund_amount_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_refund_amount_check CHECK (refund_amount >= 0 AND (refund_status = 'none' OR refund_amount > 0));

-- Danh sách "cần hoàn cọc" của chủ sân luôn nhỏ so với cả bảng
CREATE INDEX IF NOT EXISTS idx_bookings_refund_pending ON public.bookings (court_id) WHERE refund_status = 'pending';
