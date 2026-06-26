-- Seed data cho APFCO AI Training
-- Chạy sau khi đã tạo admin user qua Supabase Auth Dashboard

-- Thay {ADMIN_USER_ID} bằng UUID của user admin thực tế
-- Cách lấy: Supabase Dashboard > Authentication > Users

-- Sample Modules
INSERT INTO modules (title, slug, description, day_number, order_index, is_published, estimated_minutes, department_tags) VALUES
(
  'Tổng quan AI & ChatGPT trong công việc',
  'day1-intro-ai',
  'Hiểu AI là gì, các công cụ phổ biến (ChatGPT, Gemini), và cách bắt đầu sử dụng trong công việc hàng ngày.',
  1, 1, TRUE, 60,
  ARRAY['all']
),
(
  'Kỹ năng viết Prompt hiệu quả',
  'day1-prompt-skills',
  'Nguyên tắc viết prompt tốt: Vai trò + Ngữ cảnh + Yêu cầu + Format. Thực hành với các ví dụ thực tế.',
  1, 2, TRUE, 90,
  ARRAY['all']
),
(
  'WF-A: Ghi chú họp → Biên bản chuyên nghiệp',
  'day1-wf-a-meeting',
  'Quy trình sử dụng AI để chuyển đổi ghi chú thô thành biên bản họp và bảng action tracker.',
  1, 3, TRUE, 45,
  ARRAY['all']
),
(
  'WF-C: Số liệu sản xuất → Báo cáo quản trị',
  'day2-wf-c-production',
  'Phân tích số liệu nhà máy bằng AI: tóm tắt chỉ số, phát hiện bất thường, đề xuất hành động.',
  2, 1, TRUE, 60,
  ARRAY['factory', 'qa']
),
(
  'Ứng dụng AI cho Kinh doanh & Marketing',
  'day2-market-ai',
  'Soạn email chào hàng, báo cáo thị trường, phân tích đối thủ bằng AI.',
  2, 2, TRUE, 60,
  ARRAY['market']
),
(
  'Kế hoạch 2 tuần & AI Champion',
  'day2-action-plan',
  'Lập kế hoạch ứng dụng AI cụ thể vào công việc, cam kết và theo dõi kết quả.',
  2, 3, TRUE, 30,
  ARRAY['all']
);

-- Sample Workflow Practices
INSERT INTO workflow_practices (module_id, title, wf_code, description, prompt_template, sample_input, order_index)
SELECT
  m.id,
  'WF-A: Ghi chú họp → Biên bản + Action Tracker',
  'WF-A',
  'Chuyển đổi ghi chú họp thô thành biên bản chính thức và bảng theo dõi công việc.',
  'Bạn là thư ký chuyên nghiệp của công ty sản xuất tinh bột sắn.
Dựa trên ghi chú họp thô sau đây, hãy tạo:
1. BIÊN BẢN HỌP chính thức gồm 5 phần: Thành phần tham dự, Nội dung thảo luận, Quyết định, Vấn đề tồn đọng, Chữ ký
2. BẢNG ACTION TRACKER dạng: | STT | Việc cần làm | Người thực hiện | Deadline | Trạng thái |

Ghi chú họp:
[DÁN GHI CHÚ VÀO ĐÂY]

Lưu ý: Nếu thiếu thông tin (tên người, deadline), hãy ghi [Cần bổ sung].',
  'Họp 8h30 sáng thứ 2. Có mặt: anh Hùng GĐ, chị Lan KT, anh Minh vận hành, em Hoa nhân sự.
Bàn về kế hoạch tháng 7. Sản lượng tháng 6 đạt 95% KH. Tháng 7 cần tăng 10%.
Anh Minh báo cáo máy nghiền số 3 đang có vấn đề, cần bảo trì.
Chị Lan nhắc lương tháng 6 chưa giải ngân xong, còn 5 công nhân chưa nhận.
Anh Hùng yêu cầu: 1) Báo cáo KH tháng 7 trước thứ 6; 2) Sửa máy nghiền trước 10/7; 3) Giải ngân lương xong trước 5/7.',
  1
FROM modules m WHERE m.slug = 'day1-wf-a-meeting';

INSERT INTO workflow_practices (module_id, title, wf_code, description, prompt_template, sample_input, order_index)
SELECT
  m.id,
  'WF-C: Số liệu sản xuất → Báo cáo quản trị',
  'WF-C',
  'Phân tích số liệu vận hành nhà máy và tạo báo cáo tóm tắt cho quản lý.',
  'Bạn là chuyên gia phân tích vận hành nhà máy tinh bột sắn.
Dựa trên số liệu sản xuất sau, hãy tạo:
1. BẢNG TÓM TẮT CHỈ SỐ: Năng suất, Tỉ lệ thu hồi, Tiêu hao điện/nước, So sánh kỳ trước
2. 3 ĐIỂM BẤT THƯỜNG cần chú ý
3. 3 CÂU HỎI cần kiểm tra tại nhà máy
4. 3 VIỆC CẦN LÀM ngay trong tuần này

Số liệu:
[DÁN SỐ LIỆU VÀO ĐÂY]

Nếu thiếu benchmark, hãy ghi [Cần benchmark so sánh].',
  'Tuần 26/2026 – Nhà máy APFCO Quảng Ngãi
Sản lượng: 850 tấn (KH: 900 tấn, đạt 94.4%)
Tỉ lệ thu hồi tinh bột: 22.1% (tháng trước: 23.5%)
Tiêu hao điện: 145 kWh/tấn (tiêu chuẩn: 130 kWh/tấn)
Tiêu hao nước: 8.2 m3/tấn (tiêu chuẩn: 7.5 m3/tấn)
Thời gian dừng máy: 12h (nguyên nhân: máy thái sắn hỏng 6h, thiếu nguyên liệu 6h)
Chất lượng: độ ẩm 13.2% (OK), độ trắng 94.1% (OK)',
  1
FROM modules m WHERE m.slug = 'day2-wf-c-production';

-- Sample Assignments
INSERT INTO assignments (title, description, max_score, is_published, department_tags, rubric,
  module_id)
SELECT
  'Bài tập WF-A: Tạo biên bản họp thực tế',
  'Sử dụng AI để tạo biên bản từ ghi chú một cuộc họp thực tế của bạn (hoặc tình huống mẫu). Nộp prompt đã dùng, kết quả và nhận xét.',
  100,
  TRUE,
  ARRAY['all'],
  '[
    {"criterion": "Prompt viết đúng cấu trúc", "max_score": 30, "description": "Có đủ: vai trò, ngữ cảnh, yêu cầu, format"},
    {"criterion": "Kết quả AI đúng format biên bản", "max_score": 40, "description": "5 phần biên bản + Action Tracker đầy đủ"},
    {"criterion": "Nhận xét cá nhân sâu sắc", "max_score": 30, "description": "Rút ra được bài học, ứng dụng thực tế"}
  ]'::jsonb,
  m.id
FROM modules m WHERE m.slug = 'day1-wf-a-meeting';

INSERT INTO assignments (title, description, max_score, is_published, department_tags,
  module_id)
SELECT
  'Kế hoạch AI 2 tuần – Cam kết ứng dụng',
  'Lập kế hoạch 2-3 use case sẽ áp dụng AI trong 2 tuần tới. Trình bày: Use case, công cụ, tần suất, kết quả mong đợi.',
  100,
  TRUE,
  ARRAY['all'],
  m.id
FROM modules m WHERE m.slug = 'day2-action-plan';
