-- Kiểm thử bảo mật (RLS, quyền cột, trigger) cho Postgres.
-- Chạy bằng: npm run db:test --prefix web   (hoặc bash supabase/tests/run.sh)
-- Mỗi ca gọi t(người dùng, vai trò, câu lệnh, kết quả mong đợi, mô tả).
--   expect = 'ERR' : câu lệnh BẮT BUỘC bị từ chối (tấn công phải thất bại)
--   expect = giá trị: câu lệnh chạy được và trả về đúng giá trị đó

CREATE TABLE test_results (ok boolean NOT NULL, label text NOT NULL, detail text);

CREATE OR REPLACE FUNCTION t(uid uuid, r text, q text, expect text, label text) RETURNS void AS $$
DECLARE res text; failed boolean := false; passed boolean;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(uid::text, ''), true);
  EXECUTE 'SET LOCAL ROLE ' || r;
  BEGIN EXECUTE q INTO res; EXCEPTION WHEN OTHERS THEN failed := true; res := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  IF expect = 'ERR' THEN passed := failed; ELSE passed := (NOT failed) AND res IS NOT DISTINCT FROM expect; END IF;
  INSERT INTO test_results VALUES (passed, label, 'got=' || left(coalesce(res, 'NULL'), 70) || ' expect=' || expect);
END $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- Dữ liệu nền
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a0000000-0000-0000-0000-00000000000a', '{"full_name":"Owner","role":"owner"}'),
 ('b0000000-0000-0000-0000-00000000000b', '{"full_name":"Bao","role":"admin"}'),
 ('c0000000-0000-0000-0000-00000000000c', '{"full_name":"Chi"}'),
 ('d0000000-0000-0000-0000-00000000000d', '{"full_name":"Dung"}'),
 ('e0000000-0000-0000-0000-00000000000e', '{"full_name":"Em"}');

SELECT t(NULL,'postgres',$$SELECT role FROM profiles WHERE id='b0000000-0000-0000-0000-00000000000b'$$,'player','đăng ký với role=admin chỉ thành player');
SELECT t(NULL,'postgres',$$SELECT role FROM profiles WHERE id='a0000000-0000-0000-0000-00000000000a'$$,'owner','đăng ký role=owner vẫn được');

INSERT INTO clubs(id, owner_id, name, address) VALUES ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-00000000000a','CLB','addr');
INSERT INTO courts(id, club_id, name, sport_type, base_price_per_hour) VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','San1','pickleball',100000);
INSERT INTO bookings(id, court_id, user_id, start_time, end_time, total_price, deposit_amount, status)
 VALUES ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-00000000000b', now()+interval '1 day', now()+interval '1 day 1 hour', 100000, 30000, 'pending');
INSERT INTO matches(id, booking_id, creator_id, title, sport_type, required_players)
 VALUES ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','b0000000-0000-0000-0000-00000000000b','Keo','pickleball',3);
INSERT INTO match_participants(id, match_id, user_id) VALUES
 ('50000000-0000-0000-0000-00000000000c','44444444-4444-4444-4444-444444444444','c0000000-0000-0000-0000-00000000000c'),
 ('50000000-0000-0000-0000-00000000000d','44444444-4444-4444-4444-444444444444','d0000000-0000-0000-0000-00000000000d'),
 ('50000000-0000-0000-0000-00000000000e','44444444-4444-4444-4444-444444444444','e0000000-0000-0000-0000-00000000000e');

-- ---------------------------------------------------------------- 1. Hồ sơ
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$UPDATE profiles SET role='admin' WHERE id=auth.uid() RETURNING 'x'$$,'ERR','tự nâng role admin bị chặn');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$UPDATE profiles SET rating=5 WHERE id=auth.uid() RETURNING 'x'$$,'ERR','tự sửa rating bị chặn');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$UPDATE profiles SET full_name='Bao2' WHERE id=auth.uid() RETURNING full_name$$,'Bao2','sửa tên của mình (hợp lệ)');
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$WITH x AS (UPDATE profiles SET full_name='Hack' WHERE id='d0000000-0000-0000-0000-00000000000d' RETURNING 1) SELECT count(*)::text FROM x$$,'0','sửa hồ sơ người khác không ảnh hưởng dòng nào');

-- ---------------------------------------------------------------- 2. Đơn đặt / thanh toán / kèo
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$UPDATE bookings SET status='confirmed' WHERE id='33333333-3333-3333-3333-333333333333' RETURNING 'x'$$,'ERR','tự xác nhận đơn không cần trả tiền bị chặn');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$INSERT INTO bookings(court_id,user_id,start_time,end_time,total_price,deposit_amount,status) VALUES ('22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-00000000000b',now()+interval '3 day',now()+interval '3 day 1 hour',0,0,'confirmed') RETURNING 'x'$$,'ERR','tự chèn đơn giá 0đ đã xác nhận bị chặn');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$UPDATE matches SET current_players=1, status='open' WHERE id='44444444-4444-4444-4444-444444444444' RETURNING 'x'$$,'ERR','tự sửa bảng matches bị chặn');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$INSERT INTO payments(booking_id,user_id,order_code,amount,status) VALUES ('33333333-3333-3333-3333-333333333333','b0000000-0000-0000-0000-00000000000b',1,0,'paid') RETURNING 'x'$$,'ERR','tự chèn payment đã paid bị chặn');
SELECT t(NULL,'anon',$$SELECT count(*)::text FROM bookings$$,'0','khách chưa đăng nhập không đọc được đơn đặt');

-- ---------------------------------------------------------------- 3. Thành viên kèo & thông báo
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$UPDATE match_participants SET status='accepted' WHERE id='50000000-0000-0000-0000-00000000000c' RETURNING 'x'$$,'ERR','tự duyệt chính mình vào kèo bị chặn');
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$INSERT INTO notifications(user_id,title,message) VALUES ('b0000000-0000-0000-0000-00000000000b','spam','spam') RETURNING 'x'$$,'ERR','spam thông báo bị chặn');
SELECT t(NULL,'anon',$$INSERT INTO notifications(user_id,title,message) VALUES ('b0000000-0000-0000-0000-00000000000b','spam','spam') RETURNING 'x'$$,'ERR','khách spam thông báo bị chặn');
INSERT INTO notifications(id,user_id,title,message) VALUES ('77777777-7777-7777-7777-777777777777','c0000000-0000-0000-0000-00000000000c','Tieu de','Noi dung');
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$UPDATE notifications SET is_read=true WHERE id='77777777-7777-7777-7777-777777777777' RETURNING is_read::text$$,'true','đánh dấu đã đọc thông báo của mình');
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$UPDATE notifications SET title='doi' WHERE id='77777777-7777-7777-7777-777777777777' RETURNING 'x'$$,'ERR','sửa nội dung thông báo bị chặn');

-- ---------------------------------------------------------------- 4. Trigger đếm người trong kèo (service_role/superuser)
UPDATE match_participants SET status='accepted' WHERE id='50000000-0000-0000-0000-00000000000c';
SELECT t(NULL,'postgres',$$SELECT current_players||'/'||status FROM matches WHERE id='44444444-4444-4444-4444-444444444444'$$,'2/open','duyệt 1 người → 2 người, còn mở');
UPDATE match_participants SET status='accepted' WHERE id='50000000-0000-0000-0000-00000000000d';
SELECT t(NULL,'postgres',$$SELECT current_players||'/'||status FROM matches WHERE id='44444444-4444-4444-4444-444444444444'$$,'3/full','duyệt đủ người → full');
SELECT t(NULL,'postgres',$$UPDATE match_participants SET status='accepted' WHERE id='50000000-0000-0000-0000-00000000000e' RETURNING 'x'$$,'ERR','duyệt quá số người cần bị chặn (MATCH_FULL)');
UPDATE match_participants SET status='left' WHERE id='50000000-0000-0000-0000-00000000000d';
SELECT t(NULL,'postgres',$$SELECT current_players||'/'||status FROM matches WHERE id='44444444-4444-4444-4444-444444444444'$$,'2/open','một người rời → mở lại kèo');

-- ---------------------------------------------------------------- 5. Chat chỉ cho thành viên
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$WITH x AS (INSERT INTO match_messages(match_id,user_id,content) VALUES ('44444444-4444-4444-4444-444444444444','c0000000-0000-0000-0000-00000000000c','hi') RETURNING 1) SELECT count(*)::text FROM x$$,'1','thành viên đã duyệt chat được');
SELECT t('e0000000-0000-0000-0000-00000000000e','authenticated',$$INSERT INTO match_messages(match_id,user_id,content) VALUES ('44444444-4444-4444-4444-444444444444','e0000000-0000-0000-0000-00000000000e','hi') RETURNING 'x'$$,'ERR','người ngoài kèo gửi chat bị chặn');
SELECT t('e0000000-0000-0000-0000-00000000000e','authenticated',$$SELECT count(*)::text FROM match_messages$$,'0','người ngoài kèo không đọc được chat');
SELECT t(NULL,'anon',$$SELECT count(*)::text FROM match_messages$$,'0','khách không đọc được chat');
SELECT t('c0000000-0000-0000-0000-00000000000c','authenticated',$$SELECT count(*)::text FROM match_messages$$,'1','thành viên đọc được chat');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$INSERT INTO match_messages(match_id,user_id,content) VALUES ('44444444-4444-4444-4444-444444444444','b0000000-0000-0000-0000-00000000000b',repeat('x',1001)) RETURNING 'x'$$,'ERR','tin nhắn quá 1000 ký tự bị chặn');

-- ---------------------------------------------------------------- 6. Đánh giá chỉ cho người đã chơi
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$INSERT INTO club_reviews(club_id,user_id,rating) VALUES ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-00000000000b',5) RETURNING 'x'$$,'ERR','đánh giá khi chưa từng chơi bị chặn');
INSERT INTO bookings(court_id,user_id,start_time,end_time,total_price,deposit_amount,status) VALUES ('22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-00000000000b',now()-interval '3 day',now()-interval '3 day' + interval '1 hour',100000,30000,'confirmed');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$WITH x AS (INSERT INTO club_reviews(club_id,user_id,rating,comment) VALUES ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-00000000000b',5,'ok') RETURNING 1) SELECT count(*)::text FROM x$$,'1','đánh giá sau khi đã chơi được');
SELECT t('a0000000-0000-0000-0000-00000000000a','authenticated',$$INSERT INTO club_reviews(club_id,user_id,rating) VALUES ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-00000000000a',5) RETURNING 'x'$$,'ERR','chủ sân tự đánh giá cụm sân của mình bị chặn');

-- ---------------------------------------------------------------- 7. Hết hạn giữ chỗ
INSERT INTO bookings(id,court_id,user_id,start_time,end_time,total_price,deposit_amount,status,expires_at) VALUES ('66666666-6666-6666-6666-666666666666','22222222-2222-2222-2222-222222222222','c0000000-0000-0000-0000-00000000000c',now()+interval '5 day',now()+interval '5 day 1 hour',100000,30000,'pending',now()-interval '1 minute');
INSERT INTO payments(booking_id,user_id,order_code,amount) VALUES ('66666666-6666-6666-6666-666666666666','c0000000-0000-0000-0000-00000000000c',99,30000);
SELECT t(NULL,'postgres',$$SELECT public.expire_pending_bookings()::text$$,'1','expire_pending_bookings hủy đúng 1 đơn quá hạn');
SELECT t(NULL,'postgres',$$SELECT status FROM bookings WHERE id='66666666-6666-6666-6666-666666666666'$$,'cancelled','đơn quá hạn chuyển cancelled');
SELECT t(NULL,'postgres',$$SELECT status FROM payments WHERE order_code=99$$,'cancelled','payment của đơn quá hạn chuyển cancelled');
SELECT t(NULL,'postgres',$$SELECT count(*)::text FROM notifications WHERE user_id='c0000000-0000-0000-0000-00000000000c' AND title LIKE 'Hết hạn%'$$,'1','người đặt nhận thông báo hết hạn');
SELECT t(NULL,'postgres',$$WITH x AS (INSERT INTO bookings(court_id,user_id,start_time,end_time,total_price,deposit_amount,status) SELECT court_id,'d0000000-0000-0000-0000-00000000000d',start_time,end_time,total_price,deposit_amount,'pending' FROM bookings WHERE id='66666666-6666-6666-6666-666666666666' RETURNING 1) SELECT count(*)::text FROM x$$,'1','khung giờ vừa nhả đặt lại được');
SELECT t(NULL,'postgres',$$WITH x AS (INSERT INTO bookings(court_id,user_id,start_time,end_time,total_price,deposit_amount,status) SELECT court_id,'e0000000-0000-0000-0000-00000000000e',start_time,end_time,total_price,deposit_amount,'pending' FROM bookings WHERE user_id='d0000000-0000-0000-0000-00000000000d' RETURNING 1) SELECT count(*)::text FROM x$$,'ERR','đặt trùng khung giờ đang giữ chỗ bị ràng buộc GiST chặn');

-- ---------------------------------------------------------------- 8. Hàm đặc quyền & lịch bận
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$SELECT public.expire_pending_bookings()::text$$,'ERR','người dùng không gọi được expire_pending_bookings');
SELECT t('b0000000-0000-0000-0000-00000000000b','authenticated',$$SELECT public.next_payos_order_code()::text$$,'ERR','người dùng không gọi được next_payos_order_code');
SELECT t(NULL,'service_role',$$SELECT public.next_payos_order_code()::text$$,'10000000','service_role lấy được orderCode');
SELECT t(NULL,'anon',$$SELECT count(*)::text FROM public.get_busy_slots(ARRAY['22222222-2222-2222-2222-222222222222']::uuid[])$$,'2','khách xem được lịch bận (chỉ khung giờ còn hiệu lực)');

-- ---------------------------------------------------------------- Tổng kết
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS ket_qua, label AS ca_kiem_thu, CASE WHEN ok THEN '' ELSE detail END AS chi_tiet FROM test_results ORDER BY ok, label;
DO $$
DECLARE failed int; total int;
BEGIN
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO failed, total FROM test_results;
  RAISE NOTICE 'TONG KET: %/% ca dat', total - failed, total;
  IF failed > 0 THEN RAISE EXCEPTION '% ca kiem thu that bai', failed; END IF;
END $$;
