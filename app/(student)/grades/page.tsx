import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import { formatDateTime, getScoreColor, STATUS_LABELS } from "@/lib/utils";

export default async function GradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, assignments(title, max_score, due_date)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const graded = submissions?.filter((s) => s.status === "graded" && s.score !== null) ?? [];
  const totalScore = graded.reduce((sum, s) => sum + (s.score ?? 0), 0);
  const totalMax = graded.reduce((sum, s) => sum + ((s as any).assignments?.max_score ?? 100), 0);
  const avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kết quả học tập</h1>
        <p className="text-gray-500 mt-1">{submissions?.length ?? 0} bài tập</p>
      </div>

      {/* Summary */}
      {graded.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> Tổng kết
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{graded.length}</p>
                <p className="text-xs text-gray-400">Bài đã chấm</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${avgPct >= 80 ? "text-green-600" : avgPct >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                  {avgPct}%
                </p>
                <p className="text-xs text-gray-400">Tỷ lệ trung bình</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalScore}/{totalMax}</p>
                <p className="text-xs text-gray-400">Tổng điểm</p>
              </div>
            </div>
            <Progress value={avgPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {submissions?.map((sub) => {
          const assignment = (sub as any).assignments;
          const scorePct = sub.score !== null && assignment?.max_score
            ? Math.round((sub.score / assignment.max_score) * 100) : null;
          return (
            <Link key={sub.id} href={`/assignments/${sub.assignment_id}/submit`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      sub.status === "graded" ? "bg-green-50" :
                      sub.status === "submitted" ? "bg-blue-50" : "bg-gray-50"
                    }`}>
                      {sub.status === "graded" && sub.score !== null ? (
                        <span className={`text-lg font-bold ${getScoreColor(sub.score, assignment?.max_score)}`}>
                          {scorePct}%
                        </span>
                      ) : (
                        <Star className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{assignment?.title ?? "Bài tập"}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={`text-xs border-0 ${
                          sub.status === "graded" ? "bg-green-50 text-green-700" :
                          sub.status === "submitted" ? "bg-blue-50 text-blue-700" :
                          sub.status === "returned" ? "bg-orange-50 text-orange-700" :
                          "bg-gray-50 text-gray-500"
                        }`}>
                          {STATUS_LABELS[sub.status]}
                        </Badge>
                        {sub.status === "graded" && sub.score !== null && (
                          <span className={`text-sm font-semibold ${getScoreColor(sub.score, assignment?.max_score)}`}>
                            {sub.score}/{assignment?.max_score ?? 100} điểm
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Nộp lúc {formatDateTime(sub.created_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có bài nộp nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
