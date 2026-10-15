-- ==============================================================================
-- Migration: 20260924000000_initial_schema.sql
-- Description: Khởi tạo toàn bộ Database Schema cho Nền tảng Đặt sân & Ghép kèo Real-time
-- Stack: Supabase (PostgreSQL, Auth, RLS, Realtime)
-- ==============================================================================

-- 1. Bật các extension cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Bắt buộc để dùng GiST exclusion constraint chống trùng lịch

-- ==============================================================================
-- 2. TẠO HÀM DÙNG CHUNG (Helper Functions)
-- ==============================================================================

-- Tự động cập nhật cột updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. BẢNG PROFILES (Người dùng & Phân quyền)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'owner', 'admin')),
  skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'pro')),
  rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tự động tạo hồ sơ profile khi người dùng đăng ký qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. BẢNG CLUBS (Cụm sân thể thao)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  ward TEXT,
  district TEXT,
  city TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  open_time TIME NOT NULL DEFAULT '06:00:00',
  close_time TIME NOT NULL DEFAULT '23:00:00',
  amenities TEXT[] DEFAULT '{}', -- ví dụ: ['wifi', 'parking', 'shower', 'canteen', 'lighting']
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_owner ON public.clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_clubs_city_district ON public.clubs(city, district);

DROP TRIGGER IF EXISTS update_clubs_updated_at ON public.clubs;
CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. BẢNG COURTS (Sân con)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ví dụ: 'Sân 1', 'Sân VIP Pickleball'
  sport_type TEXT NOT NULL, -- 'football', 'badminton', 'pickleball', 'tennis', 'basketball'
  surface_type TEXT, -- 'cỏ nhân tạo', 'sàn gỗ', 'thảm vinyl', 'acrylic'
  base_price_per_hour NUMERIC NOT NULL CHECK (base_price_per_hour >= 0),
  deposit_percentage INTEGER NOT NULL DEFAULT 30 CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100), -- Chủ sân tự cấu hình % cọc
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courts_club ON public.courts(club_id);
CREATE INDEX IF NOT EXISTS idx_courts_sport_type ON public.courts(sport_type);

DROP TRIGGER IF EXISTS update_courts_updated_at ON public.courts;
CREATE TRIGGER update_courts_updated_at
BEFORE UPDATE ON public.courts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. BẢNG COURT_PRICING_RULES (Bảng giá linh hoạt theo khung giờ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.court_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ví dụ: 'Khung giờ vàng tối (17h-21h)', 'Cuối tuần'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,0}', -- 0=CN, 1=T2, ..., 6=T7
  price_per_hour NUMERIC NOT NULL CHECK (price_per_hour >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_court ON public.court_pricing_rules(court_id);

-- ==============================================================================
-- 7. BẢNG BOOKINGS (Lịch đặt sân & Chống trùng lịch tuyệt đối)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  during TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_time, end_time, '[)')) STORED,
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  deposit_amount NUMERIC NOT NULL CHECK (deposit_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'), -- Giữ chỗ 15 phút chờ quét mã PayOS
  is_open_match BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_booking_time_valid CHECK (end_time > start_time)
);

-- Thêm constraint prevent_booking_overlap nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prevent_booking_overlap'
  ) THEN
    ALTER TABLE public.bookings ADD CONSTRAINT prevent_booking_overlap EXCLUDE USING gist (
      court_id WITH =,
      during WITH &&
    ) WHERE (status IN ('pending', 'confirmed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_court ON public.bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_during ON public.bookings USING gist (during);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. BẢNG MATCHES (Ghép kèo thể thao)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sport_type TEXT NOT NULL,
  skill_level TEXT NOT NULL DEFAULT 'all' CHECK (skill_level IN ('all', 'beginner', 'intermediate', 'advanced')),
  required_players INTEGER NOT NULL DEFAULT 1 CHECK (required_players > 0),
  current_players INTEGER NOT NULL DEFAULT 1 CHECK (current_players >= 1),
  cost_sharing_type TEXT NOT NULL DEFAULT 'split' CHECK (cost_sharing_type IN ('split', 'host_covers')), -- Chia đều hoặc Bao trọn sân
  cost_per_person NUMERIC DEFAULT 0 CHECK (cost_per_person >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_booking ON public.matches(booking_id);
CREATE INDEX IF NOT EXISTS idx_matches_creator ON public.matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. BẢNG MATCH_PARTICIPANTS (Thành viên tham gia ghép kèo)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'left')),
  message TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thêm constraint unique_match_participant nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_match_participant'
  ) THEN
    ALTER TABLE public.match_participants ADD CONSTRAINT unique_match_participant UNIQUE (match_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_participants_match ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON public.match_participants(user_id);

-- ==============================================================================
-- 10. BẢNG PAYMENTS (Giao dịch cọc / thanh toán VietQR PayOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_code BIGINT NOT NULL UNIQUE, -- Mã đơn hàng theo PayOS (dạng số nguyên duy nhất)
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'vietqr_payos',
  payos_transaction_id TEXT,
  qr_code_url TEXT,
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_code ON public.payments(order_code);

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Kích hoạt RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 11.1 Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 11.2 Clubs Policies
DROP POLICY IF EXISTS "Active clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Active clubs are viewable by everyone"
  ON public.clubs FOR SELECT
  USING (is_active = true OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can insert own clubs" ON public.clubs;
CREATE POLICY "Owners can insert own clubs"
  ON public.clubs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own clubs" ON public.clubs;
CREATE POLICY "Owners can update own clubs"
  ON public.clubs FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own clubs" ON public.clubs;
CREATE POLICY "Owners can delete own clubs"
  ON public.clubs FOR DELETE
  USING (auth.uid() = owner_id);

-- 11.3 Courts Policies
DROP POLICY IF EXISTS "Active courts are viewable by everyone" ON public.courts;
CREATE POLICY "Active courts are viewable by everyone"
  ON public.courts FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.clubs WHERE clubs.id = courts.club_id AND clubs.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Club owners can manage courts" ON public.courts;
CREATE POLICY "Club owners can manage courts"
  ON public.courts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.clubs WHERE clubs.id = courts.club_id AND clubs.owner_id = auth.uid()
  ));

-- 11.4 Pricing Rules Policies
DROP POLICY IF EXISTS "Pricing rules are viewable by everyone" ON public.court_pricing_rules;
CREATE POLICY "Pricing rules are viewable by everyone"
  ON public.court_pricing_rules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Club owners can manage court pricing rules" ON public.court_pricing_rules;
CREATE POLICY "Club owners can manage court pricing rules"
  ON public.court_pricing_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courts
    JOIN public.clubs ON clubs.id = courts.club_id
    WHERE courts.id = court_pricing_rules.court_id AND clubs.owner_id = auth.uid()
  ));

-- 11.5 Bookings Policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.courts
      JOIN public.clubs ON clubs.id = courts.club_id
      WHERE courts.id = bookings.court_id AND clubs.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings or club owners manage bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings or club owners manage bookings"
  ON public.bookings FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.courts
      JOIN public.clubs ON clubs.id = courts.club_id
      WHERE courts.id = bookings.court_id AND clubs.owner_id = auth.uid()
    )
  );

-- 11.6 Matches Policies
DROP POLICY IF EXISTS "Open matches are viewable by everyone" ON public.matches;
CREATE POLICY "Open matches are viewable by everyone"
  ON public.matches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Booking owners can create matches" ON public.matches;
CREATE POLICY "Booking owners can create matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Match creators can update their matches" ON public.matches;
CREATE POLICY "Match creators can update their matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = creator_id);

-- 11.7 Match Participants Policies
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.match_participants;
CREATE POLICY "Participants are viewable by everyone"
  ON public.match_participants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can request to join matches" ON public.match_participants;
CREATE POLICY "Authenticated users can request to join matches"
  ON public.match_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Participants or match creator can update participant status" ON public.match_participants;
CREATE POLICY "Participants or match creator can update participant status"
  ON public.match_participants FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.matches WHERE matches.id = match_participants.match_id AND matches.creator_id = auth.uid()
    )
  );

-- 11.8 Payments Policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.bookings
      JOIN public.courts ON courts.id = bookings.court_id
      JOIN public.clubs ON clubs.id = courts.club_id
      WHERE bookings.id = payments.booking_id AND clubs.owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- 12. REALTIME CONFIGURATION
-- ==============================================================================
-- Đăng ký các bảng cần thông báo tức thời (Real-time updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;
