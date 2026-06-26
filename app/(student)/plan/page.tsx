import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActionPlanForm } from "@/components/student/ActionPlanForm";

const SUGGESTED_USE_CASES = [
  { title: "Tự động tạo biên bản họp từ ghi chú thô", tool: "ChatGPT", frequency: "Hàng tuần" },
  { title: "Soạn thảo báo cáo sản xuất định kỳ", tool: "ChatGPT", frequency: "Hàng ngày" },
  { title: "Phân tích số liệu sản xuất và đề xuất cải tiến", tool: "Gemini", frequency: "Hàng tuần" },
  { title: "Soạn email nội bộ và thông báo chuyên nghiệp", tool: "ChatGPT", frequency: "Hàng ngày" },
  { title: "Tìm kiếm và tóm tắt tài liệu kỹ thuật", tool: "NotebookLM", frequency: "Khi cần" },
  { title: "Tạo kế hoạch và phân công công việc", tool: "ChatGPT", frequency: "Hàng tuần" },
  { title: "Dịch tài liệu kỹ thuật (Lào/Anh)", tool: "Gemini", frequency: "Khi cần" },
  { title: "Phân tích dữ liệu Excel nhanh", tool: "ChatGPT", frequency: "Hàng tuần" },
];

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: plan } = await supabase
    .from("action_plans")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kế hoạch ứng dụng AI 2 tuần</h1>
        <p className="text-gray-500 mt-1">Cam kết áp dụng AI vào công việc thực tế sau khóa học</p>
      </div>

      <ActionPlanForm
        studentId={user.id}
        existingPlan={plan}
        suggestedUseCases={SUGGESTED_USE_CASES}
      />
    </div>
  );
}
