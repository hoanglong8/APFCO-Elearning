import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { SubmissionForm } from "@/components/student/SubmissionForm";
import { formatDate, formatDateTime, getScoreColor } from "@/lib/utils";

export default async function SubmitPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: assignment }, { data: submission }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", params.id).single(),
    supabase.from("submissions").select("*").eq("assignment_id", params.id).eq("student_id", user.id).single(),
  ]);

  if (!assignment) notFound();

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
        </div>
      </div>

      {/* Rubric */}
      {assignment.rubric && Array.isArray(assignment.rubric) && assignment.rubric.length > 0 && (
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

      {/* Submission form */}
      <SubmissionForm
        assignmentId={params.id}
        studentId={user.id}
        existingSubmission={submission}
        maxScore={assignment.max_score}
      />
    </div>
  );
}
