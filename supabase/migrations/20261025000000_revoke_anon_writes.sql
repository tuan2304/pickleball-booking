-- ==============================================================================
-- Migration: 20261025000000_revoke_anon_writes.sql
-- Description: Khách chưa đăng nhập (anon) không bao giờ cần ghi dữ liệu.
--
-- Mọi policy ghi hiện có đều dựa vào auth.uid() nên RLS đã chặn anon, nhưng role này vẫn giữ
-- quyền INSERT/UPDATE/DELETE ở mức bảng (mặc định của Supabase). Thu hồi để bảo vệ hai lớp:
-- nếu sau này lỡ viết policy ghi quá rộng thì anon vẫn không ghi được.
-- Bảng mới tạo sau này cũng không còn tự động cấp quyền ghi cho anon.
-- ==============================================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;
