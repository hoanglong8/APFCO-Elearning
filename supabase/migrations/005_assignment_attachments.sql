-- ============================================================
-- 005: File đính kèm cho bài tập (admin đính kèm tài liệu mẫu/đề bài
-- khi tạo bài tập — .pdf, .docx, .xlsx, ảnh...). Dùng chung bucket
-- "materials" (đã public, staff đã có quyền upload/sửa/xoá từ 003).
-- ============================================================

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_name TEXT;
