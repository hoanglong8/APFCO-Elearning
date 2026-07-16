"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { QuizQuestion } from "@/types/database.types";

export type QuizResult =
  | { error: string }
  | { score: number; correct: number; total: number; maxScore: number };

// Chấm trắc nghiệm phía server (service role) để học viên không tự đặt điểm.
// Trả lỗi dưới dạng giá trị vì Next.js che message của Error throw từ
// server action ở production.
export async function submitQuiz(assignmentId: string, answers: number[]): Promise<QuizResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn chưa đăng nhập." };

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: assignment, error: aErr } = await service
    .from("assignments")
    .select("id, max_score, quiz_questions, is_published, due_date")
    .eq("id", assignmentId)
    .single();
  if (aErr || !assignment) return { error: "Không tìm thấy bài tập." };
  if (!assignment.is_published) return { error: "Bài tập chưa được mở." };

  const questions = (assignment.quiz_questions ?? []) as QuizQuestion[];
  if (questions.length === 0) return { error: "Bài tập này không có câu hỏi trắc nghiệm." };
  if (answers.length !== questions.length || answers.some((a) => a === null || a === undefined || a < 0)) {
    return { error: "Bạn chưa trả lời đủ các câu hỏi." };
  }

  const { data: existing } = await service
    .from("submissions")
    .select("id, status")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing?.status === "graded") {
    return { error: "Bạn đã hoàn thành bài trắc nghiệm này." };
  }

  const correct = questions.reduce((n, q, i) => n + (answers[i] === q.correct_index ? 1 : 0), 0);
  const score = Math.round((correct / questions.length) * assignment.max_score);
  const isLate = Boolean(assignment.due_date && new Date(assignment.due_date) < new Date());

  const payload = {
    assignment_id: assignmentId,
    student_id: user.id,
    quiz_answers: answers,
    content: `Trắc nghiệm: ${correct}/${questions.length} câu đúng`,
    status: "graded" as const,
    score,
    is_late: isLate,
    // Trigger set_submission_late chỉ set submitted_at khi status='submitted',
    // quiz vào thẳng 'graded' nên tự ghi ở đây
    submitted_at: new Date().toISOString(),
    graded_at: new Date().toISOString(),
  };

  const { error: subErr } = existing
    ? await service.from("submissions").update(payload).eq("id", existing.id)
    : await service.from("submissions").insert(payload);
  if (subErr) return { error: "Lỗi lưu bài: " + subErr.message };

  return { score, correct, total: questions.length, maxScore: assignment.max_score };
}
