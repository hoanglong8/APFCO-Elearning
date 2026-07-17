import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, CheckCircle2, XCircle, Paperclip, Download } from "lucide-react";
import Link from "next/link";
import { SubmissionForm } from "@/components/student/SubmissionForm";
import { QuizForm } from "@/components/student/QuizForm";
import { formatDate, formatDateTime, getScoreColor } from "@/lib/utils";
import type { QuizQuestion } from "@/types/database.types";

export default async function SubmitPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: assignment }, { data: submission }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", params.id).single(),
    supabase.from("submissions").select("*").eq("assignment_id", params.id).eq("student_id", user.id).single(),
  ]);

  if (!assignment) notFound();

  const quizQuestions = (assignment.quiz_questions ?? []) as QuizQuestion[];
  const isQuiz = assignment.assignment_type === "quiz" && quizQuestions.length > 0;
  const isPastDue = Boolean(assignment.due_date && new Date(assignment.due_date) < new Date());

  // Bucket submissions là private — tạo signed URL để học viên xem lại file đã nộp
  let fileSignedUrl: string | null = null;
  if (submission?.file_url) {
    const { data: signed } = await supabase.storage
      .from("submissions")
      .createSignedUrl(submission.file_url, 3600);
    fileSignedUrl = signed?.signedUrl ?? null;
  }

  const quizAnswers = (submission?.quiz_answers ?? null) as number[] | null;

  return (
    <div className="space-y-6">
      <Link href="/assignments" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
        {assignment.description && <p className="text-gray-500 mt-1">{assignment.description}</p>}
        <div className="flex items-center gap-3 mt-3">
          {assignment.due_date && (
            <Badge variant="outline">Hạn nộp: {formatDate(assignment.due_date)}</Badge>
          )}
          <Badge variant="outline">{assignment.max_score} điểm</Badge>
          {submission?.is_late && (
            <Badge className="bg-amber-50 text-amber-700 border-0">Nộp muộn</Badge>
          )}
        </div>
      </div>

      {/* File đính kèm từ trainer */}
      {assignment.attachments && assignment.attachments.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Tài liệu đề bài / mẫu từ trainer ({assignment.attachments.length})
            </p>
            <div className="space-y-1.5">
              {assignment.attachments.map((att, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-gray-900 truncate min-w-0">{att.name}</p>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="w-3 h-3" /> Tải file
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rubric */}
      {!isQuiz && assignment.rubric && Array.isArray(assignment.rubric) && assignment.rubric.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tiêu chí chấm điểm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(assignment.rubric as any[]).map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.criterion}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">{item.max_score}đ</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graded result */}
      {submission?.status === "graded" && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800 flex items-center gap-2">
              <Star className="w-4 h-4" /> Kết quả chấm điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${getScoreColor(submission.score ?? 0, assignment.max_score)}`}>
                {submission.score}
              </span>
              <span className="text-gray-400">/ {assignment.max_score} điểm</span>
            </div>
            {submission.feedback && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Phản hồi từ Trainer:</p>
                <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border">{submission.feedback}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">Chấm lúc: {formatDateTime(submission.graded_at!)}</p>
          </CardContent>
        </Card>
      )}

      {/* Returned feedback */}
      {submission?.status === "returned" && submission.feedback && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-800">Phản hồi từ Trainer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">{submission.feedback}</p>
          </CardContent>
        </Card>
      )}

      {isQuiz ? (
        submission?.status === "graded" && quizAnswers ? (
          /* Xem lại bài trắc nghiệm đã chấm */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Xem lại bài làm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {quizQuestions.map((q, qi) => {
                const chosen = quizAnswers[qi];
                const isCorrect = chosen === q.correct_index;
                return (
                  <div key={qi} className="space-y-2">
                    <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                      {isCorrect
                        ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      Câu {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`p-2.5 rounded-lg border text-sm ${
                            oi === q.correct_index
                              ? "border-green-500 bg-green-50 text-green-900"
                              : oi === chosen
                                ? "border-red-300 bg-red-50 text-red-800"
                                : "border-gray-100 text-gray-500"
                          }`}
                        >
                          {opt}
                          {oi === q.correct_index && <span className="ml-2 text-xs font-medium">✓ Đáp án đúng</span>}
                          {oi === chosen && oi !== q.correct_index && <span className="ml-2 text-xs">Bạn chọn</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <QuizForm
            assignmentId={params.id}
            // Không truyền correct_index xuống client trước khi nộp
            questions={quizQuestions.map((q) => ({ question: q.question, options: q.options }))}
            isPastDue={isPastDue}
          />
        )
      ) : (
        <SubmissionForm
          assignmentId={params.id}
          studentId={user.id}
          existingSubmission={submission}
          maxScore={assignment.max_score}
          dueDate={assignment.due_date}
          existingFileSignedUrl={fileSignedUrl}
        />
      )}
    </div>
  );
}
