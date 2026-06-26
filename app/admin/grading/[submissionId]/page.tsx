import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GradingPanel } from "@/components/admin/GradingPanel";
import { formatDateTime } from "@/lib/utils";

export default async function GradingDetailPage({ params }: { params: { submissionId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, profiles(full_name, email, department, factory), assignments(title, max_score, rubric, description)")
    .eq("id", params.submissionId)
    .single();

  if (!submission) notFound();

  const profile = (submission as any).profiles;
  const assignment = (submission as any).assignments;

  return (
    <div className="space-y-6">
      <Link href="/admin/grading" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{assignment?.title}</h1>
          <p className="text-gray-500 mt-1">
            Nộp bởi <strong>{profile?.full_name}</strong> · {formatDateTime((submission as any).created_at)}
          </p>
        </div>
        <Badge className={`text-sm ${(submission as any).status === "graded" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
          {(submission as any).status === "graded" ? "Đã chấm" : "Chờ chấm"}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submission content */}
        <div className="space-y-4">
          {(submission as any).content && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nội dung bài làm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {(submission as any).content}
                </div>
              </CardContent>
            </Card>
          )}

          {(submission as any).prompt_used && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prompt đã dùng</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {(submission as any).prompt_used}
                </pre>
              </CardContent>
            </Card>
          )}

          {(submission as any).ai_output && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kết quả AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 bg-blue-50 rounded-lg p-4 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {(submission as any).ai_output}
                </div>
              </CardContent>
            </Card>
          )}

          {(submission as any).reflection && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nhận xét cá nhân</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 italic">{(submission as any).reflection}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Grading panel */}
        <GradingPanel
          submission={submission as any}
          rubric={assignment?.rubric ?? []}
          maxScore={assignment?.max_score ?? 100}
          graderId={user.id}
        />
      </div>
    </div>
  );
}
