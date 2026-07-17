-- ============================================================
-- 006: Cho phép đính kèm NHIỀU file khi tạo bài tập (thay vì 1).
-- Đổi từ 2 cột đơn (attachment_url, attachment_name) sang 1 mảng
-- JSONB [{ url, name }], theo cùng khuôn mẫu rubric/quiz_questions
-- đã dùng trên bảng này.
-- ============================================================

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Chuyển dữ liệu 1-file cũ (nếu có) vào mảng mới trước khi xoá cột cũ.
UPDATE assignments
SET attachments = jsonb_build_array(jsonb_build_object('url', attachment_url, 'name', attachment_name))
WHERE attachment_url IS NOT NULL
  AND (attachments IS NULL OR attachments = '[]'::jsonb);

ALTER TABLE assignments DROP COLUMN IF EXISTS attachment_url;
ALTER TABLE assignments DROP COLUMN IF EXISTS attachment_name;
