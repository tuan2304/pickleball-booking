-- ==============================================================================
-- Migration: 20261027000000_drop_payouts_table.sql
-- Description: Xóa bảng payouts (sổ chi trả cho chủ sân) vì tính năng đối soát đã bỏ.
--
-- Không còn code nào đọc hoặc ghi bảng này (deletion-guards cũng đã bỏ phép kiểm tra).
-- Dòng sổ cũ duy nhất trên production đã được sao lưu trước khi xóa.
-- Policy và index của bảng bị xóa theo. Không dùng CASCADE: nếu còn đối tượng nào
-- phụ thuộc (ví dụ hàm club_balances chưa bị gỡ) thì lệnh sẽ dừng thay vì xóa lan.
-- ==============================================================================
DROP TABLE IF EXISTS public.payouts;
