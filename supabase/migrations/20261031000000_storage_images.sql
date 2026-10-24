-- ==============================================================================
-- Migration: 20261031000000_storage_images.sql
-- Description: Kho ảnh do người dùng tải lên: ảnh cụm sân (chủ sân) và ảnh đại diện (mỗi người).
--
-- Bucket công khai để hiển thị ảnh qua URL, nhưng chỉ ghi được vào thư mục của chính mình:
--   club-images/<club_id>/...   chỉ chủ cụm sân đó
--   avatars/<user_id>/...       chỉ chính người đó
-- Chỉ nhận JPEG/PNG/WebP, tối đa 5 MB (ảnh đại diện 2 MB); không nhận SVG vì có thể chứa script.
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('club-images', 'club-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---- Ảnh cụm sân: thư mục đầu tiên của đường dẫn phải là id cụm sân do mình sở hữu
DROP POLICY IF EXISTS "Club owners read own club images" ON storage.objects;
CREATE POLICY "Club owners read own club images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-images'
    AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Club owners upload own club images" ON storage.objects;
CREATE POLICY "Club owners upload own club images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-images'
    AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Club owners update own club images" ON storage.objects;
CREATE POLICY "Club owners update own club images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-images'
    AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'club-images'
    AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Club owners delete own club images" ON storage.objects;
CREATE POLICY "Club owners delete own club images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-images'
    AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid())
  );

-- ---- Ảnh đại diện: thư mục đầu tiên là id người dùng
DROP POLICY IF EXISTS "Users read own avatars" ON storage.objects;
CREATE POLICY "Users read own avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(objects.name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(objects.name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(objects.name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(objects.name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(objects.name))[1] = auth.uid()::text);
