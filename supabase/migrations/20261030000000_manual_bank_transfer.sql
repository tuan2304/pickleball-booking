-- ==============================================================================
-- Migration: 20261030000000_manual_bank_transfer.sql
-- Description: Nhà cung cấp thanh toán thứ hai: chuyển khoản ngân hàng thủ công (VietQR tĩnh).
--
-- Chủ sân chưa có hoặc không muốn dùng PayOS có thể khai báo tài khoản ngân hàng. Khách nhận mã VietQR kèm
-- số tiền và nội dung chuyển khoản, bấm "Tôi đã chuyển khoản"; chủ sân đối chiếu rồi xác nhận đơn.
-- Tiền vẫn về thẳng tài khoản của chủ sân, SportArena không giữ hộ.
-- ==============================================================================

-- Cờ do server bật khi chủ sân khai báo tài khoản. Không nằm trong danh sách cột được GRANT cho người dùng,
-- nên chủ sân không tự bật được.
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS accepts_manual_transfer BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.club_bank_accounts (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  bank_bin TEXT NOT NULL CHECK (bank_bin ~ '^[0-9]{6}$'),
  account_number TEXT NOT NULL CHECK (account_number ~ '^[0-9]{6,20}$'),
  account_name TEXT NOT NULL CHECK (char_length(account_name) BETWEEN 2 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_club_bank_accounts_updated_at ON public.club_bank_accounts;
CREATE TRIGGER update_club_bank_accounts_updated_at
BEFORE UPDATE ON public.club_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Chỉ chủ cụm sân đọc được; ghi qua server (đã kiểm tra quyền sở hữu). Khách nhìn thấy thông tin này
-- ở trang thanh toán do server đọc bằng service_role, không đọc trực tiếp từ bảng.
ALTER TABLE public.club_bank_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_bank_accounts FROM anon, authenticated;
GRANT SELECT ON public.club_bank_accounts TO authenticated;

DROP POLICY IF EXISTS "Owners can view own bank account" ON public.club_bank_accounts;
CREATE POLICY "Owners can view own bank account"
  ON public.club_bank_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_bank_accounts.club_id AND c.owner_id = auth.uid()));
