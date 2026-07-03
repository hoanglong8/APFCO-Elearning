-- ============================================================
-- Storage policies cho bucket "materials"
-- Bucket đã được tạo (public). Cần policy trên storage.objects để:
--  - Nhân viên (admin/trainer/director) upload / sửa / xóa file
--  - Mọi người đọc được (bucket public)
-- Dùng lại hàm public.is_staff() từ migration 002.
-- ============================================================

DROP POLICY IF EXISTS "Staff upload materials" ON storage.objects;
CREATE POLICY "Staff upload materials" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials' AND public.is_staff());

DROP POLICY IF EXISTS "Staff update materials" ON storage.objects;
CREATE POLICY "Staff update materials" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materials' AND public.is_staff());

DROP POLICY IF EXISTS "Staff delete materials" ON storage.objects;
CREATE POLICY "Staff delete materials" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials' AND public.is_staff());

DROP POLICY IF EXISTS "Public read materials" ON storage.objects;
CREATE POLICY "Public read materials" ON storage.objects FOR SELECT
  USING (bucket_id = 'materials');
