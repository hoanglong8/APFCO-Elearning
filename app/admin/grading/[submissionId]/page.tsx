import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Paperclip, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { GradingPanel } from "@/components/admin/GradingPanel";
import { formatDateTime } from "@/lib/utils";
import type { QuizQuestion } from "@/types/database.types";

export default async function GradingDetailPage({ params }: { params: { submissionId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(full_name, email, department, factory), assignments(title, max_score, rubric, description, quiz_questions)")
    .eq("id", params.submissionId)
    .single();

  if (!submission) notFound();

  const profile = (submission as any).profiles;
  const assignment = (submission as any).assignments;
  const sub = submission as any;

  const quizQuestions = (assignment?.quiz_questions ?? []) as QuizQuestion[];
  const quizAnswers = (sub.quiz_answers ?? null) as number[] | null;

  // Bucket submissions là private — tạo signed URL cho trainer tải file
  let fileSignedUrl: string | null = null;
  if (sub.file_url) {
    const { data: signed } = await supabase.storage
      .from("submissions")
      .createSignedUrl(sub.file_url, 3600);
    fileSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/grading" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{assignment?.title}</h1>
          <p className="text-gray-500 mt-1">
            Nộp bởi <strong>{profile?.full_name}</strong> · {formatDateTime(sub.submitted_at ?? sub.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sub.is_late && (
            <Badge className="text-sm bg-amber-100 text-amber-800">Nộp muộn</Badge>
          )}
          <Badge className={`text-sm ${sub.status === "graded" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
            {sub.status === "graded" ? "Đã chấm" : "Chờ chấm"}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submission content */}
        <div className="space-y-4">
          {sub.content && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nội dung bài làm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {sub.content}
                </div>
              </CardContent>
            </Card>
          )}

          {fileSignedUrl && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> File đính kèm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a href={fileSignedUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Tải / Xem file</Button>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Quiz review */}
          {quizQuestions.length > 0 && quizAnswers && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bài trắc nghiệm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {quizQuestions.map((q, qi) => {
                  const chosen = quizAnswers[qi];
                  const isCorrect = chosen === q.correct_index;
                  return (
                    <div key={qi} className="text-sm space-y-1">
                      <p className="font-medium flex items-center gap-2">
                        {isCorrect
                          ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        Câu {qi + 1}. {q.question}
                      </p>
                      <p className="text-gray-600 pl-6">
                        Học viên chọn: <strong>{q.options[chosen] ?? "—"}</strong>
                        {!isCorrect && (
                          <> · Đáp án đúng: <strong className="text-green-700">{q.options[q.correct_index]}</strong></>
                        )}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {sub.prompt_used && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prompt đã dùng</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {sub.prompt_used}
                </pre>
              </CardContent>
            </Card>
          )}

          {sub.ai_output && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kết quả AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 bg-blue-50 rounded-lg p-4 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {sub.ai_output}
                </div>
              </CardContent>
            </Card>
          )}

          {sub.reflection && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nhận xét cá nhân</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 italic">{sub.reflection}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Grading panel */}
        <GradingPanel
          submission={sub}
          rubric={assignment?.rubric ?? []}
          maxScore={assignment?.max_score ?? 100}
          graderId={user.id}
        />
      </div>
    </div>
  );
}
