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

export async function gradeSubmissionWithAIAction(submissionId: string): Promise<AIGradingResult> {
  await requireStaff();
  const supabase = await createServerClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("content, prompt_used, ai_output, reflection, file_url, quiz_answers, assignments(title, description, max_score, rubric, quiz_questions)")
    .eq("id", submissionId)
    .single();

  if (!submission) return { success: false, error: "Không tìm thấy bài nộp." };

  const assignment = (submission as any).assignments;

  return gradeSubmissionWithAI({
    assignmentTitle: assignment?.title ?? "",
    assignmentDescription: assignment?.description ?? null,
    maxScore: assignment?.max_score ?? 100,
    rubric: assignment?.rubric ?? [],
    quizQuestions: assignment?.quiz_questions ?? [],
    quizAnswers: (submission as any).quiz_answers ?? null,
    content: (submission as any).content,
    promptUsed: (submission as any).prompt_used,
    aiOutput: (submission as any).ai_output,
    reflection: (submission as any).reflection,
    hasAttachment: Boolean((submission as any).file_url),
  });
}
