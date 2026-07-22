"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { gradeSubmissionWithAI, type AIGradingResult } from "@/lib/ai-grading";

async function requireStaff() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bạn chưa đăng nhập.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "trainer", "director"].includes(profile.role)) {
    throw new Error("Bạn không có quyền chấm bài.");
  }
  return user;
}

const SUBMISSION_GRADING_SELECT =
  "content, prompt_used, ai_output, reflection, file_url, quiz_answers, profiles!submissions_student_id_fkey(full_name), assignments(title, description, max_score, rubric, quiz_questions)";

function toGradingInput(submission: any) {
  const assignment = submission.assignments;
  return {
    assignmentTitle: assignment?.title ?? "",
    assignmentDescription: assignment?.description ?? null,
    maxScore: assignment?.max_score ?? 100,
    rubric: assignment?.rubric ?? [],
    quizQuestions: assignment?.quiz_questions ?? [],
    quizAnswers: submission.quiz_answers ?? null,
    content: submission.content,
    promptUsed: submission.prompt_used,
    aiOutput: submission.ai_output,
    reflection: submission.reflection,
    hasAttachment: Boolean(submission.file_url),
  };
}

export async function gradeSubmissionWithAIAction(submissionId: string): Promise<AIGradingResult> {
  await requireStaff();
  const supabase = await createServerClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select(SUBMISSION_GRADING_SELECT)
    .eq("id", submissionId)
    .single();

  if (!submission) return { success: false, error: "Không tìm thấy bài nộp." };

  return gradeSubmissionWithAI(toGradingInput(submission));
}

export interface BulkAIGradeResult {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  success: boolean;
  totalScore?: number;
  maxScore?: number;
  error?: string;
}

// Chấm bằng AI và LƯU/TRẢ BÀI NGAY cho từng bài đã chọn (khác với chấm 1 bài —
// ở đó AI chỉ gợi ý, admin phải bấm xác nhận). Xử lý tuần tự để không vượt
// rate limit của Gemini API và tránh chấm trùng khi 1 bài lỗi giữa chừng.
export async function bulkGradeSubmissionsWithAIAction(submissionIds: string[]): Promise<BulkAIGradeResult[]> {
  const user = await requireStaff();
  const supabase = await createServerClient();
  const results: BulkAIGradeResult[] = [];

  for (const id of submissionIds) {
    const { data: submission } = await supabase
      .from("submissions")
      .select(SUBMISSION_GRADING_SELECT)
      .eq("id", id)
      .single();

    const assignment = (submission as any)?.assignments;
    const studentName = (submission as any)?.profiles?.full_name ?? "";
    const assignmentTitle = assignment?.title ?? "";

    if (!submission) {
      results.push({ submissionId: id, studentName, assignmentTitle, success: false, error: "Không tìm thấy bài nộp." });
      continue;
    }

    const gradeResult = await gradeSubmissionWithAI(toGradingInput(submission));
    if (!gradeResult.success || typeof gradeResult.totalScore !== "number") {
      results.push({
        submissionId: id,
        studentName,
        assignmentTitle,
        success: false,
        error: gradeResult.error ?? "AI chấm điểm thất bại.",
      });
      continue;
    }

    const { error: updateErr } = await supabase
      .from("submissions")
      .update({
        score: gradeResult.totalScore,
        feedback: gradeResult.feedback ?? "",
        status: "graded",
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq("id", id);

    results.push({
      submissionId: id,
      studentName,
      assignmentTitle,
      success: !updateErr,
      totalScore: gradeResult.totalScore,
      maxScore: assignment?.max_score ?? 100,
      error: updateErr?.message,
    });
  }

  return results;
}

export interface BulkReturnResult {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  success: boolean;
  error?: string;
}

// Yêu cầu học viên nộp lại hàng loạt (status -> "returned"). Giữ nguyên điểm
// cũ (đúng theo hành vi khi trả lại 1 bài ở GradingPanel); nếu có "note", nối
// thêm vào feedback hiện có thay vì ghi đè, để không mất nhận xét trước đó.
export async function bulkRequestResubmissionAction(
  submissionIds: string[],
  note?: string
): Promise<BulkReturnResult[]> {
  const user = await requireStaff();
  const supabase = await createServerClient();
  const results: BulkReturnResult[] = [];
  const trimmedNote = note?.trim();

  for (const id of submissionIds) {
    const { data: submission } = await supabase
      .from("submissions")
      .select("feedback, profiles!submissions_student_id_fkey(full_name), assignments(title)")
      .eq("id", id)
      .single();

    const studentName = (submission as any)?.profiles?.full_name ?? "";
    const assignmentTitle = (submission as any)?.assignments?.title ?? "";

    if (!submission) {
      results.push({ submissionId: id, studentName, assignmentTitle, success: false, error: "Không tìm thấy bài nộp." });
      continue;
    }

    const existingFeedback = (submission as any).feedback as string | null;
    const feedback = trimmedNote
      ? [existingFeedback, trimmedNote].filter(Boolean).join("\n")
      : existingFeedback;

    const { error } = await supabase
      .from("submissions")
      .update({
        status: "returned",
        feedback,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq("id", id);

    results.push({ submissionId: id, studentName, assignmentTitle, success: !error, error: error?.message });
  }

  return results;
}
