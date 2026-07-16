-- ============================================================
-- 004: Sửa luồng nộp bài + quiz + thông báo
--  1. Fix bug: học viên không sửa được bài bị trả (status = 'returned')
--  2. Đánh dấu nộp muộn (is_late) tự động bằng trigger, không tin client
--  3. Quiz trắc nghiệm: câu hỏi lưu ở assignments, đáp án ở submissions
--  4. Bucket "submissions" (private) cho học viên nộp file đính kèm
--  5. Bảng notifications + trigger tạo thông báo khi chấm/trả bài,
--     khi publish bài tập mới
-- ============================================================

-- ---------- 1. Học viên được sửa bài bị trả ----------
-- USING cho phép sửa cả bài 'returned'; WITH CHECK chặn học viên
-- tự đặt status thành 'graded'.
DROP POLICY IF EXISTS "Students update own non-graded submissions" ON submissions;
CREATE POLICY "Students update own non-graded submissions" ON submissions FOR UPDATE
  USING (auth.uid() = student_id AND status IN ('draft', 'submitted', 'returned'))
  WITH CHECK (auth.uid() = student_id AND status IN ('draft', 'submitted'));

-- Policy INSERT gốc (001) không ràng buộc status → học viên có thể tự chèn
-- bản ghi status='graded' kèm điểm tự đặt. Siết lại tương tự UPDATE.
-- (Quiz chấm tự động dùng service role nên không bị ảnh hưởng.)
DROP POLICY IF EXISTS "Students manage own submissions" ON submissions;
CREATE POLICY "Students manage own submissions" ON submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id AND status IN ('draft', 'submitted'));

-- ---------- 2. Nộp muộn ----------
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_submission_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  due TIMESTAMPTZ;
BEGIN
  -- Chỉ tính khi bài chuyển sang trạng thái 'submitted'
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    NEW.submitted_at := NOW();
    SELECT due_date INTO due FROM assignments WHERE id = NEW.assignment_id;
    IF due IS NOT NULL AND NOW() > due THEN
      NEW.is_late := TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_submission_late ON submissions;
CREATE TRIGGER trg_set_submission_late
  BEFORE INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_submission_late();

-- ---------- 3. Quiz trắc nghiệm ----------
-- quiz_questions: [{ question, options: text[], correct_index }]
-- Lưu ý: học viên có quyền SELECT assignments nên về lý thuyết có thể
-- đọc correct_index qua API. Chấp nhận được với đào tạo nội bộ.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS quiz_questions JSONB;
-- quiz_answers: mảng index đáp án học viên chọn, cùng thứ tự câu hỏi
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS quiz_answers JSONB;

-- ---------- 4. Bucket nộp bài (private) ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Path quy ước: {student_id}/{assignment_id}/{filename}
DROP POLICY IF EXISTS "Students upload own submission files" ON storage.objects;
CREATE POLICY "Students upload own submission files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Students read own submission files" ON storage.objects;
CREATE POLICY "Students read own submission files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Students update own submission files" ON storage.objects;
CREATE POLICY "Students update own submission files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Students delete own submission files" ON storage.objects;
CREATE POLICY "Students delete own submission files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Staff read all submission files" ON storage.objects;
CREATE POLICY "Staff read all submission files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submissions' AND public.is_staff());

-- ---------- 5. Thông báo ----------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Thông báo khi bài được chấm hoặc bị trả
CREATE OR REPLACE FUNCTION public.notify_submission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_title TEXT;
BEGIN
  IF NEW.status IN ('graded', 'returned') AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO a_title FROM assignments WHERE id = NEW.assignment_id;
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (
      NEW.student_id,
      CASE WHEN NEW.status = 'graded'
        THEN 'Bài làm đã được chấm điểm'
        ELSE 'Bài làm cần nộp lại' END,
      CASE WHEN NEW.status = 'graded'
        THEN COALESCE(a_title, 'Bài tập') || ': ' || COALESCE(NEW.score::text, '?') || ' điểm'
        ELSE COALESCE(a_title, 'Bài tập') || ': trainer yêu cầu bạn chỉnh sửa và nộp lại' END,
      '/assignments/' || NEW.assignment_id || '/submit'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_submission_status ON submissions;
CREATE TRIGGER trg_notify_submission_status
  AFTER UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_submission_status();

-- Thông báo khi bài tập được publish (theo phòng ban áp dụng)
CREATE OR REPLACE FUNCTION public.notify_assignment_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM TRUE) THEN
    INSERT INTO notifications (user_id, title, body, link)
    SELECT p.id,
           'Bài tập mới: ' || NEW.title,
           CASE WHEN NEW.due_date IS NOT NULL
             THEN 'Hạn nộp: ' || to_char(NEW.due_date AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
             ELSE NULL END,
           '/assignments/' || NEW.id || '/submit'
    FROM profiles p
    WHERE p.role = 'student'
      AND (NEW.department_tags IS NULL
           OR NEW.department_tags @> ARRAY['all']
           OR p.department = ANY(NEW.department_tags));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_published ON assignments;
CREATE TRIGGER trg_notify_assignment_published
  AFTER INSERT OR UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_published();
