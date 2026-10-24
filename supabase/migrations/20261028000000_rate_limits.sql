-- ==============================================================================
-- Migration: 20261028000000_rate_limits.sql
-- Description: Giới hạn tần suất gọi các thao tác nhạy cảm (đăng nhập, đặt sân, chat, ticket...).
--
-- Bộ đếm cửa sổ cố định đặt trong database vì server chạy serverless (nhiều instance, không chia sẻ RAM).
-- Chỉ server (service_role) gọi được; người dùng không đọc hay ghi trực tiếp bảng này.
-- Ứng dụng coi lỗi của hàm này là "cho qua", nên migration có thể áp trước hay sau khi deploy code.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

-- Tăng bộ đếm của khóa p_key trong cửa sổ hiện tại và cho biết còn được phép không.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_window_seconds INTEGER, p_max INTEGER)
RETURNS TABLE (allowed BOOLEAN, hit_count INTEGER, retry_after INTEGER) AS $$
DECLARE
  win_start TIMESTAMPTZ;
  win_end TIMESTAMPTZ;
  current_hits INTEGER;
BEGIN
  IF p_window_seconds < 1 OR p_max < 1 THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT';
  END IF;

  win_start := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds);
  win_end := win_start + make_interval(secs => p_window_seconds);

  INSERT INTO public.rate_limits AS rl (key, window_start, hits)
  VALUES (p_key, win_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = rl.hits + 1
  RETURNING rl.hits INTO current_hits;

  -- Dọn các cửa sổ cũ thỉnh thoảng (khoảng 1% số lần gọi) để bảng không phình ra
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT
    current_hits <= p_max,
    current_hits,
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (win_end - clock_timestamp())))::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;
