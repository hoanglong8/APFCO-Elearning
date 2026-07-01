-- ============================================================
-- Fix: infinite recursion detected in policy for relation "profiles"
-- Nguyên nhân: các policy tham chiếu bảng profiles bằng subquery
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (...))
-- ngay trong policy của chính profiles -> đệ quy vô hạn.
-- Giải pháp: dùng hàm SECURITY DEFINER đọc role, bỏ qua RLS.
-- ============================================================

-- Helper: lấy role của user hiện tại, chạy với quyền owner (bỏ qua RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: user hiện tại có phải admin/trainer/director không
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin', 'trainer', 'director');
$$;

-- ---------- PROFILES ----------
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
CREATE POLICY "Admins view all profiles" ON profiles FOR SELECT USING (
  public.is_staff()
);

-- ---------- MODULES ----------
DROP POLICY IF EXISTS "Students see published modules" ON modules;
CREATE POLICY "Students see published modules" ON modules FOR SELECT USING (
  is_published = TRUE OR public.is_staff()
);
DROP POLICY IF EXISTS "Admins manage modules" ON modules;
CREATE POLICY "Admins manage modules" ON modules FOR ALL USING (
  public.is_staff()
);

-- ---------- MATERIALS ----------
DROP POLICY IF EXISTS "Students see materials of published modules" ON materials;
CREATE POLICY "Students see materials of published modules" ON materials FOR SELECT USING (
  EXISTS (SELECT 1 FROM modules WHERE id = module_id AND (is_published OR public.is_staff()))
);
DROP POLICY IF EXISTS "Admins manage materials" ON materials;
CREATE POLICY "Admins manage materials" ON materials FOR ALL USING (
  public.is_staff()
);

-- ---------- WORKFLOW PRACTICES ----------
DROP POLICY IF EXISTS "Admins manage workflow practices" ON workflow_practices;
CREATE POLICY "Admins manage workflow practices" ON workflow_practices FOR ALL USING (
  public.is_staff()
);

-- ---------- ASSIGNMENTS ----------
DROP POLICY IF EXISTS "Students see published assignments" ON assignments;
CREATE POLICY "Students see published assignments" ON assignments FOR SELECT USING (
  is_published = TRUE OR public.is_staff()
);
DROP POLICY IF EXISTS "Admins manage assignments" ON assignments;
CREATE POLICY "Admins manage assignments" ON assignments FOR ALL USING (
  public.is_staff()
);

-- ---------- SUBMISSIONS ----------
DROP POLICY IF EXISTS "Admins see all submissions" ON submissions;
CREATE POLICY "Admins see all submissions" ON submissions FOR ALL USING (
  public.is_staff()
);

-- ---------- MODULE PROGRESS ----------
DROP POLICY IF EXISTS "Admins see all progress" ON module_progress;
CREATE POLICY "Admins see all progress" ON module_progress FOR SELECT USING (
  public.is_staff()
);

-- ---------- PRACTICE LOGS ----------
DROP POLICY IF EXISTS "Admins see all practice logs" ON practice_logs;
CREATE POLICY "Admins see all practice logs" ON practice_logs FOR SELECT USING (
  public.is_staff()
);

-- ---------- ACTION PLANS ----------
DROP POLICY IF EXISTS "Admins see all action plans" ON action_plans;
CREATE POLICY "Admins see all action plans" ON action_plans FOR SELECT USING (
  public.is_staff()
);

-- ---------- TRAINING REPORTS ----------
DROP POLICY IF EXISTS "Admins manage reports" ON training_reports;
CREATE POLICY "Admins manage reports" ON training_reports FOR ALL USING (
  public.is_staff()
);
DROP POLICY IF EXISTS "Directors view reports" ON training_reports;
CREATE POLICY "Directors view reports" ON training_reports FOR SELECT USING (
  public.current_user_role() = 'director'
);
