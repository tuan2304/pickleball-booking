-- ==============================================================================
-- Migration: 20261019000000_add_chat_and_reviews.sql
-- Description: Thêm bảng Live Chat phòng Kèo (match_messages) & Đánh giá Cụm sân (club_reviews)
--              (Giai đoạn 9: Nâng cấp Live Chat & Đánh giá/Review)
-- ==============================================================================

-- ==============================================================================
-- 1. BẢNG MATCH_MESSAGES (Tin nhắn Live Chat trong Kèo Giao Lưu)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.match_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_messages_match_id ON public.match_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_match_messages_created_at ON public.match_messages(created_at ASC);

-- RLS cho match_messages
ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;

-- Mọi người đều có thể đọc tin nhắn trong kèo
DROP POLICY IF EXISTS "Match messages are viewable by everyone" ON public.match_messages;
CREATE POLICY "Match messages are viewable by everyone"
  ON public.match_messages FOR SELECT
  USING (true);

-- Người dùng đã đăng nhập có thể gửi tin nhắn
DROP POLICY IF EXISTS "Authenticated users can insert match messages" ON public.match_messages;
CREATE POLICY "Authenticated users can insert match messages"
  ON public.match_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 2. BẢNG CLUB_REVIEWS (Đánh giá & Nhận xét Cụm sân)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.club_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_club_review UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_reviews_club_id ON public.club_reviews(club_id);
CREATE INDEX IF NOT EXISTS idx_club_reviews_user_id ON public.club_reviews(user_id);

-- RLS cho club_reviews
ALTER TABLE public.club_reviews ENABLE ROW LEVEL SECURITY;

-- Mọi người đều có thể xem đánh giá sân
DROP POLICY IF EXISTS "Club reviews are viewable by everyone" ON public.club_reviews;
CREATE POLICY "Club reviews are viewable by everyone"
  ON public.club_reviews FOR SELECT
  USING (true);

-- Người dùng đăng nhập có thể gửi đánh giá
DROP POLICY IF EXISTS "Authenticated users can insert club reviews" ON public.club_reviews;
CREATE POLICY "Authenticated users can insert club reviews"
  ON public.club_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Người dùng có thể cập nhật đánh giá của chính mình
DROP POLICY IF EXISTS "Users can update their own club reviews" ON public.club_reviews;
CREATE POLICY "Users can update their own club reviews"
  ON public.club_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. ĐĂNG KÝ REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_reviews;
  END IF;
END $$;

