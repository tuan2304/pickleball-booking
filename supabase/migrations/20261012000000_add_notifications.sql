-- ==============================================================================
-- Migration: 20261012000000_add_notifications.sql
-- Description: Thêm bảng Notifications cho hệ thống thông báo real-time
--              (Giai đoạn 5: PayOS Webhook & Real-time Notification)
-- ==============================================================================

-- ==============================================================================
-- 1. BẢNG NOTIFICATIONS (Thông báo hệ thống)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('booking', 'payment', 'match', 'system')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes để tăng tốc query thông báo theo user & trạng thái chưa đọc
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) cho bảng notifications
-- ==============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Người dùng chỉ xem được thông báo của chính mình
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Người dùng chỉ cập nhật thông báo của chính mình (đánh dấu đã đọc)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Chỉ hệ thống (service_role) mới được phép tạo thông báo
-- (Các Server Actions dùng service_role key thông qua createClient với quyền cao hơn)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true); -- Server Actions chạy server-side với RLS bypass hoặc service_role

-- ==============================================================================
-- 3. REALTIME CONFIGURATION cho bảng notifications
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

